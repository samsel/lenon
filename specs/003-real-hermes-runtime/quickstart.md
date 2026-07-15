# Quickstart: Real Hermes Runtime

## Verify Plan-Mode Runtime Contract

```bash
npm run test:runtime
```

This does not require Docker, Hermes, Ollama, or secrets.

## Provider Defaults

Lenon's open-source default is provider-unconfigured. Configure a provider locally or in deployment secrets before expecting real inference to work.

Do not make a personal Codex OAuth session, `~/.codex/auth.json`, or Codex access token the default child runtime credential. Those belong to trusted Codex workflows, not committed product defaults.

## Plan Ava's Runtime With Local Ollama

```bash
npm run hermes:runtime -- plan \
  --child-id child_ava \
  --nickname Ava \
  --age-band 9-12 \
  --port 8643 \
  --inference-model gemma4:26b \
  --inference-provider custom \
  --inference-base-url http://host.docker.internal:11434/v1
```

Then set local app env values only on your machine:

```bash
HERMES_RUNTIME_MODE=real
HERMES_PROFILE_REGISTRY_FILE=.local/hermes-runtimes/registry.json
```

## Provision With Docker

```bash
npm run hermes:runtime -- provision \
  --child-id child_ava \
  --nickname Ava \
  --age-band 9-12 \
  --port 8643 \
  --inference-model gemma4:26b \
  --inference-provider custom \
  --inference-base-url http://host.docker.internal:11434/v1
```

## Configure Another Provider

Use the same runtime manager options with operator-selected values:

```bash
npm run hermes:runtime -- plan \
  --child-id child_ava \
  --nickname Ava \
  --age-band 9-12 \
  --port 8643 \
  --inference-model <provider-model-name> \
  --inference-provider <hermes-provider-id> \
  --inference-base-url <optional-openai-compatible-base-url>
```

Provider secrets belong in local env, the Hermes profile's secret configuration, or a deployment secret manager.

## Start Internal Provisioner

```bash
HERMES_RUNTIME_MANAGER_KEY=<local-random-manager-key> \
HERMES_RUNTIME_INFERENCE_MODEL=gemma4:26b \
HERMES_RUNTIME_INFERENCE_PROVIDER=custom \
HERMES_RUNTIME_INFERENCE_BASE_URL=http://host.docker.internal:11434/v1 \
npm run hermes:runtime-server
```

Then configure the app locally:

```bash
HERMES_RUNTIME_MODE=real
HERMES_PROFILE_REGISTRY_FILE=.local/hermes-runtimes/registry.json
HERMES_PROVISIONER_URL=http://127.0.0.1:8787/provision-child
HERMES_PROVISIONER_KEY=<local-random-manager-key>
```

Do not commit any generated `.local/` files or real key values.
