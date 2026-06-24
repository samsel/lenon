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
- dropped Linux capabilities
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

## Provisioner Server

Start the internal provisioner:

```bash
HERMES_RUNTIME_MANAGER_KEY=dev-local-secret npm run hermes:runtime-server
```

Then point the app at it:

```bash
HERMES_RUNTIME_MODE=real
HERMES_PROFILE_REGISTRY_FILE=.local/hermes-runtimes/registry.json
HERMES_PROVISIONER_URL=http://127.0.0.1:8787/provision-child
HERMES_PROVISIONER_KEY=dev-local-secret
```

When a parent creates a child in Lenon real mode, the app calls the provisioner, the provisioner starts the child Hermes container, and the app stores the returned Hermes mapping.

## Production Notes

Do not expose the Runtime Manager publicly. It can command Docker, so treat it as privileged infrastructure.

For production, replace the Docker implementation behind the same high-level operations:

- `provisionChildRuntime`
- `startRuntime`
- `stopRuntime`
- `statusRuntime`
- `destroyRuntime`

Good production targets are ECS/Fargate tasks, Kubernetes Pods, or Nomad jobs. If Hermes tools eventually execute code, browse, or access files for children, use stronger isolation such as gVisor, Kata Containers, Firecracker-backed tasks, or separate ephemeral tool sandboxes.

