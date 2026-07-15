# Runtime API Contracts

## GET `/api/admin/hermes/runtime-audit`

Returns a redacted array of child runtime audits.

### Response

```json
[
  {
    "childProfileId": "child_ava",
    "hermesAgentId": "hermes_profile_child_ava",
    "profileName": "child_ava",
    "modelName": "child_ava",
    "baseUrl": "http://127.0.0.1:8643",
    "containerName": "lenon-hermes-child-ava",
    "containerRunning": false,
    "apiReachable": false,
    "dockerSocket": "unknown",
    "apiServerToolsets": [],
    "disabledToolsets": [],
    "secrets": {
      "apiKeyConfigured": true,
      "apiKeyExposed": false,
      "registrySource": "file"
    },
    "checks": [
      {
        "id": "api_reachable",
        "label": "Hermes API reachable",
        "status": "fail",
        "detail": "GET /v1/models failed"
      }
    ],
    "auditedAt": "2026-07-14T00:00:00.000Z"
  }
]
```

### Redaction Rules

- MUST NOT include API key values.
- MUST NOT include bearer tokens.
- MUST NOT include raw registry JSON.
- MUST redact URL credentials, query strings, and fragments.

## POST `/api/admin/hermes/runtime-audit/provision`

Attempts to provision missing configured children through the local runtime manager if `HERMES_PROVISIONER_URL` is configured.

### Response

```json
{
  "results": [
    {
      "childProfileId": "child_ava",
      "hermesAgentId": "hermes_profile_child_ava",
      "status": "provisioned",
      "summary": "Provisioner created a child Hermes runtime."
    }
  ],
  "audits": []
}
```

## Runtime Manager Provider Options

The runtime manager accepts provider configuration as operator input:

- `--inference-model`
- `--inference-provider`
- `--inference-base-url`

Equivalent environment defaults may be supplied to the provisioner:

- `HERMES_RUNTIME_INFERENCE_MODEL`
- `HERMES_RUNTIME_INFERENCE_PROVIDER`
- `HERMES_RUNTIME_INFERENCE_BASE_URL`

These values are not secrets by themselves in many deployments, but they may reveal provider topology. Credentials are never committed and must be managed by Hermes/local env/secret manager configuration.

## POST `/api/child/chat`

Real mode routes allowed messages to the child Hermes runtime. Runtime errors return a safe fallback response rather than a raw server failure.

### Runtime-Unavailable Response

```json
{
  "messageId": "msg_runtime_fallback_abc123",
  "hermesAgentId": "hermes_profile_child_ava",
  "response": "Lenon is having trouble reaching your learning helper right now. I saved the safe part of this turn, and you can try again in a moment or ask a grown-up for help.",
  "policyAction": "educational_redirect",
  "assistantMessage": {
    "id": "msg_runtime_fallback_abc123",
    "role": "assistant",
    "content": "Lenon is having trouble reaching your learning helper right now. I saved the safe part of this turn, and you can try again in a moment or ask a grown-up for help.",
    "policyAction": "educational_redirect",
    "createdAt": "2026-07-14T00:00:00.000Z"
  },
  "skillState": {
    "hermesRuntime": "unavailable",
    "fallback": true
  },
  "rewards": [],
  "checkpoint": null,
  "timeRemainingSeconds": 900
}
```
