# Real Hermes Integration

This app now supports two Hermes runtime modes:

- `demo` — local in-memory Hermes-shaped behavior for UI/demo work.
- `real` — server-to-server calls into a real Hermes profile API server.

Real Hermes does not expose the product-style `agents.create` control plane imagined in the original spec. The real isolation primitive is a **Hermes profile**. A profile has its own `HERMES_HOME`, `config.yaml`, `.env`, `SOUL.md`, memory, sessions, skills, state database, logs, and gateway process.

## Target Model

```txt
Child account
  -> product child_profile_id
  -> hermes_profile_child_<id>
  -> dedicated Hermes runtime directory
  -> dedicated Hermes gateway/API server
  -> model provider configured inside that profile
```

The browser never receives Hermes API tokens. The Next.js API routes resolve `child_profile_id` to the configured Hermes profile and call Hermes server-to-server.

## Environment

Set real mode:

```bash
HERMES_RUNTIME_MODE=real
```

For the local Docker Runtime Manager path:

```bash
HERMES_PROFILE_REGISTRY_FILE=.local/hermes-runtimes/registry.json
```

For one profile:

```bash
HERMES_AGENT_ID=hermes_profile_child_ava
HERMES_CHILD_PROFILE_ID=child_ava
HERMES_PROFILE_NAME=child_ava
HERMES_API_BASE_URL=http://127.0.0.1:8643
HERMES_API_KEY=replace-with-profile-api-key
HERMES_MODEL_NAME=child_ava
```

For many children, use the registry:

```bash
HERMES_PROFILE_REGISTRY='{
  "hermes_profile_child_ava": {
    "profileName": "child_ava",
    "baseUrl": "http://127.0.0.1:8643",
    "apiKey": "replace-with-ava-key",
    "modelName": "child_ava"
  },
  "hermes_profile_child_milo": {
    "profileName": "child_milo",
    "baseUrl": "http://127.0.0.1:8644",
    "apiKey": "replace-with-milo-key",
    "modelName": "child_milo"
  }
}'
```

## Provision A Child Docker Runtime

The recommended local MVP path is the Docker Runtime Manager:

```bash
npm run hermes:runtime -- plan \
  --child-id child_ava \
  --nickname Ava \
  --age-band 9-12 \
  --port 8643
```

When Docker is available:

```bash
npm run hermes:runtime -- provision \
  --child-id child_ava \
  --nickname Ava \
  --age-band 9-12 \
  --port 8643
```

This writes `.local/hermes-runtimes/registry.json`, creates the child data directory, generates a per-child API key, and starts a Hermes container bound to loopback only.

For automatic onboarding in real mode:

```bash
HERMES_RUNTIME_MANAGER_KEY=<local-random-manager-key> npm run hermes:runtime-server
```

Set:

```bash
HERMES_PROVISIONER_URL=http://127.0.0.1:8787/provision-child
HERMES_PROVISIONER_KEY=<local-random-manager-key>
```

See `docs/hermes-runtime-manager.md`.

## Manual Profile Provisioning

First create/configure a Hermes template profile manually. Recommended:

1. Install Hermes.
2. Create a template profile such as `kidsafe-template`.
3. Configure the model/provider with `hermes -p kidsafe-template model` or `hermes -p kidsafe-template setup --portal`.
4. Use a conservative/blank setup and enable only the toolsets you explicitly want.

Then provision a child:

```bash
npm run hermes:provision-child -- \
  --child-id child_ava \
  --nickname Ava \
  --age-band 9-12 \
  --profile child_ava \
  --template-profile kidsafe-template \
  --port 8643 \
  --execute
```

The script:

- creates/clones the Hermes profile
- writes API server settings to the profile `.env`
- writes a child-safe `SOUL.md`
- writes `KIDSAFE_POLICY.json`
- writes `KIDSAFE_CONFIG_SNIPPET.yaml`
- prints the registry JSON to add to this app's environment

Start the dedicated API process:

```bash
hermes -p child_ava gateway
```

Hermes should expose:

```txt
http://127.0.0.1:8643/v1/responses
http://127.0.0.1:8643/v1/models
```

## Current Real-Mode App Behavior

Implemented:

- server-side `child_profile_id -> hermes profile runtime` resolution
- real `/v1/responses` calls for child chat
- stable `X-Hermes-Session-Id`
- stable `X-Hermes-Session-Key`
- file-based runtime registry via `HERMES_PROFILE_REGISTRY_FILE`
- local Docker Runtime Manager provisioner/CLI/server
- `/v1/skills` discovery when available
- no API token exposure to the browser

Still needed for production-grade child safety:

- KidSafe Hermes plugin/hooks for input gates, output gates, event logging, and parent policy enforcement
- real database persistence for child/profile mappings
- integration tests against a real local Hermes gateway
- admin isolation audit that verifies profile directory, API port, token, toolsets, and session DB separation

## Safety Notes

A profile is not a sandbox by itself. The Hermes docs are explicit that profile isolation scopes Hermes state through `HERMES_HOME`, but the default local terminal backend still has the OS user's filesystem access.

For child profiles:

- prefer one container/process per child for MVP
- set `terminal.home_mode: profile`
- disable terminal, browser, web, code, delegation, cron, and memory unless intentionally enabled
- do not expose the Hermes API server directly to browsers
- use a unique API key per child profile
- use a unique API port per child profile
- log every request with `child_profile_id`, `hermes_profile_name`, and request ID
