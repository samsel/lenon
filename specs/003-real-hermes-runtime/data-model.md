# Data Model: Real Hermes Runtime

## HermesRuntimeRegistryEntry

- `hermesAgentId`: Registry key and active runtime identity.
- `childProfileId`: Lenon child profile ID.
- `profileName`: Hermes profile name.
- `baseUrl`: Server-side Hermes gateway base URL.
- `apiKey`: Server-only bearer key. Never returned to browsers or committed docs.
- `modelName`: Child-facing Hermes model alias.
- `isolationMode`: `docker_container` or `hermes_profile_process`.
- `gatewayMode`: `container_api_server` or `dedicated_api_server`.
- `containerName`: Optional Docker container name for local audit.

## ChildRuntimeAudit

- `childProfileId`
- `hermesAgentId`
- `profileName`
- `modelName`
- `modelProvider`
- `modelBackend`: Redacted backend/provider URL.
- `baseUrl`: Redacted Hermes gateway URL.
- `containerName`
- `containerRunning`
- `apiReachable`
- `apiStatus`
- `terminalBackend`
- `dockerSocket`
- `apiServerToolsets`
- `disabledToolsets`
- `secrets.apiKeyConfigured`
- `secrets.apiKeyExposed`: Always false.
- `secrets.registrySource`: `file`, `env`, `single_env`, or `none`.
- `checks[]`: Pass/warn/fail/unknown audit checks.
- `auditedAt`

## RuntimeFallbackEvent

- `hermesAgentId`
- `childProfileId`
- `category`: `runtime_unavailable`
- `severity`: `medium`
- `action`: `educational_redirect`
- `summary`: Redacted runtime failure summary with no child message text.
- `createdAt`

## RuntimeManagerPlan

- `runtime.json`: Child runtime metadata.
- `registry.json`: App-readable runtime registry.
- `data/.env`: Local runtime server secret values, under ignored runtime root.
- `data/SOUL.md`: Child-safe Hermes profile instructions.
- `data/KIDSAFE_POLICY.json`: Product policy metadata.
- `data/config.yaml`: Conservative child runtime config.
- `data/KIDSAFE_CONFIG_SNIPPET.yaml`: Manual merge guidance for existing profiles.

## InferenceProviderConfig

- `inferenceModel`: Provider model identifier, such as a local Ollama model or an operator-selected hosted model.
- `inferenceProvider`: Hermes provider identifier, such as `custom` for an OpenAI-compatible local endpoint.
- `inferenceBaseUrl`: Optional OpenAI-compatible base URL.
- `credentialSource`: Operator-managed credential source. This is documented outside committed runtime registry output and must not contain secret values.
- `defaultState`: `unconfigured` in the open-source repo.
