# Hermes Runtime Manager

The local Runtime Manager provisions one isolated Hermes Docker runtime per child profile.

It is intentionally small:

```txt
Lenon app
  -> HERMES_PROVISIONER_URL
  -> local Runtime Manager
  -> Docker daemon
  -> one Hermes container per child
```

This is the MVP implementation of the architecture. It gives each child a dedicated container, data directory, API key, host port, and registry entry. The production version can replace the Docker calls with ECS/Fargate, Kubernetes, or Nomad while keeping the app-facing provisioner contract.

## Generated Files

By default, runtime state lives under:

```txt
.local/hermes-runtimes/
  registry.json
  children/
    child_ava/
      runtime.json
      data/
        .env
        SOUL.md
        KIDSAFE_POLICY.json
        KIDSAFE_CONFIG_SNIPPET.yaml
```

`.local/` is gitignored because it contains runtime secrets and child-specific state.

Fresh Docker child runtimes also get a conservative `config.yaml` when one does not already exist. The manager does not overwrite an existing Hermes config because provider/model setup may have added local machine details.

## Plan A Child Runtime

This writes local runtime files and the registry, but does not start Docker:

```bash
npm run hermes:runtime -- plan \
  --child-id child_ava \
  --nickname Ava \
  --age-band 9-12 \
  --port 8643
```

The app can read the generated registry file with:

```bash
HERMES_RUNTIME_MODE=real
HERMES_PROFILE_REGISTRY_FILE=.local/hermes-runtimes/registry.json
```

## Provision A Docker Runtime

This starts the official Hermes container for the child:

```bash
npm run hermes:runtime -- provision \
  --child-id child_ava \
  --nickname Ava \
  --age-band 9-12 \
  --port 8643
```

The container is created with:

- one bind-mounted child data directory at `/opt/data`
- loopback-only API exposure, for example `127.0.0.1:8643 -> 8642`
- one generated `API_SERVER_KEY`
- CPU, memory, and PID limits
- `no-new-privileges`
- Docker's default capability set, which the Hermes s6 supervisor needs during startup
- no Docker socket mount

## Runtime Commands

```bash
npm run hermes:runtime -- doctor
npm run hermes:runtime -- registry
npm run hermes:runtime -- status --child-id child_ava
npm run hermes:runtime -- stop --child-id child_ava
npm run hermes:runtime -- start --child-id child_ava
npm run hermes:runtime -- destroy --child-id child_ava
```

Use `--remove-files` with `destroy` only when you intentionally want to delete the child runtime directory.

## Verify The Runtime Contract

The fastest check does not require Docker, Hermes, Ollama, OpenAI, or secrets:

```bash
npm run test:runtime
```

This creates a temporary child runtime plan, verifies the registry and generated child config contract, and deletes the temporary files.

## Configure A Model Provider

The runtime manager does not force Ollama as the only backend. It accepts provider configuration from CLI options or provisioner environment variables:

```bash
--inference-model <provider-model-name>
--inference-provider <hermes-provider-id>
--inference-base-url <optional-openai-compatible-base-url>
```

For the provisioner server, use:

```bash
HERMES_RUNTIME_INFERENCE_MODEL=<provider-model-name>
HERMES_RUNTIME_INFERENCE_PROVIDER=<hermes-provider-id>
HERMES_RUNTIME_INFERENCE_BASE_URL=<optional-openai-compatible-base-url>
```

The open-source default is unconfigured. Operators choose Ollama, OpenAI Platform, Bedrock, or another Hermes-supported provider through local/deployment configuration. Do not commit provider keys, Codex OAuth sessions, `~/.codex/auth.json`, Codex access tokens, or other personal credentials.

OpenAI Codex OAuth is for Codex local tooling and trusted Codex workflows. It should not be Lenon's default child runtime credential. If an operator uses an OpenAI-hosted model for Hermes, prefer secret-managed OpenAI Platform/API credentials or a Hermes-supported provider integration.

## Use Local Ollama/Gemma As One Provider Option

For local development, a child Hermes container can use Ollama running on the host machine through Ollama's OpenAI-compatible API.

Prerequisites:

```bash
ollama serve
ollama pull gemma4:26b
```

Provision or start the child runtime, then configure Hermes inside that child container:

```bash
docker exec lenon-hermes-child-ava hermes config set model.default gemma4:26b
docker exec lenon-hermes-child-ava hermes config set model.provider custom
docker exec lenon-hermes-child-ava hermes config set model.base_url http://host.docker.internal:11434/v1
docker restart lenon-hermes-child-ava
```

Use `custom` because Hermes talks to local Ollama through the standard OpenAI-compatible `/v1` API. Do not use `ollama-cloud` unless the runtime should call Ollama's hosted service instead.

Keep `API_SERVER_MODEL_NAME` and the runtime registry `modelName` as the child-facing profile name, for example `child_ava`. Lenon sends requests to Ava's agent model alias, while Hermes routes the profile to the configured backend model.

## Child Runtime Hardening

The Hermes API server platform defaults to a broad tool surface. Lenon child runtimes should start as plain chat agents and only gain tools after explicit review.

The generated child config sets:

```yaml
platform_toolsets:
  cli:
    - no_mcp
  api_server:
    - no_mcp
terminal:
  backend: docker
agent:
  disabled_toolsets:
    - web
    - browser
    - terminal
    - file
    - code_execution
    - vision
    - image_gen
    - skills
    - memory
    - delegation
    - cronjob
```

The real config also disables the remaining built-in optional toolsets such as video, TTS, X search, smart-home, Discord, Spotify, and computer-use. `terminal.backend: docker` is a fail-closed default for these containers because the runtime does not mount the Docker socket.

Audit the active API-server surface with:

```bash
docker exec lenon-hermes-child-ava hermes tools list --platform api_server
```

Every built-in toolset should show `disabled` for the strict child-chat profile. Plain model inference should still work through `/v1/responses`.

## Provisioner Server

Start the internal provisioner:

```bash
HERMES_RUNTIME_MANAGER_KEY=<local-random-manager-key> npm run hermes:runtime-server
```

Then point the app at it:

```bash
HERMES_RUNTIME_MODE=real
HERMES_PROFILE_REGISTRY_FILE=.local/hermes-runtimes/registry.json
HERMES_PROVISIONER_URL=http://127.0.0.1:8787/provision-child
HERMES_PROVISIONER_KEY=<local-random-manager-key>
```

When a parent creates a child in Lenon real mode, the app calls the provisioner, the provisioner starts the child Hermes container, and the app stores the returned Hermes mapping.

For local Ollama-backed provisioning, run the provisioner with local-only inference defaults:

```bash
HERMES_RUNTIME_MANAGER_KEY=<local-random-manager-key> \
HERMES_RUNTIME_INFERENCE_MODEL=gemma4:26b \
HERMES_RUNTIME_INFERENCE_PROVIDER=custom \
HERMES_RUNTIME_INFERENCE_BASE_URL=http://host.docker.internal:11434/v1 \
npm run hermes:runtime-server
```

These values are deployment configuration. Keep them in local env or secret managers, not in committed files.

For another provider, keep the same variables and substitute the operator-selected model/provider/base URL values. Keep credentials in Hermes profile configuration, local env, or a secret manager.

## Production Notes

Do not expose the Runtime Manager publicly. It can command Docker, so treat it as privileged infrastructure.

For production, replace the Docker implementation behind the same high-level operations:

- `provisionChildRuntime`
- `startRuntime`
- `stopRuntime`
- `statusRuntime`
- `destroyRuntime`

Good production targets are ECS/Fargate tasks, Kubernetes Pods, or Nomad jobs. If Hermes tools eventually execute code, browse, or access files for children, use stronger isolation such as gVisor, Kata Containers, Firecracker-backed tasks, or separate ephemeral tool sandboxes.
