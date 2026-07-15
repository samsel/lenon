# Feature Specification: Real Hermes Runtime

**Feature Branch**: `003-real-hermes-runtime`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Implement a real local Hermes runtime path for Lenon so each child profile maps to an isolated Hermes agent gateway, supports configurable model-provider operation, exposes redacted parent/admin runtime audit, and degrades safely when Hermes or the configured provider is unavailable."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Child Uses A Real Hermes Runtime Safely (Priority: P1)

As a child, I can chat through my assigned Lenon/Hermes child agent when real runtime mode is enabled, and I receive a gentle safe fallback if the runtime is missing, starting, slow, or unavailable.

**Why this priority**: Child chat is the core product path. Real mode must not crash, hang indefinitely, bypass safety gates, or expose runtime details to the child.

**Independent Test**: Run the child chat API in real mode with a configured registry and with a missing/offline runtime; allowed messages route server-to-server to Hermes when reachable, while unavailable runtime responses are gentle, redacted, and do not expose API keys or registry values.

**Acceptance Scenarios**:

1. **Given** `HERMES_RUNTIME_MODE=real` and a registry entry for `child_ava`, **When** Ava sends an allowed learning message, **Then** the server calls only Ava's configured Hermes `/v1/responses` endpoint and returns the assistant response to the child UI.
2. **Given** `HERMES_RUNTIME_MODE=real` but Ava's runtime is missing or offline, **When** Ava sends an otherwise allowed message, **Then** Lenon returns a child-safe fallback reply and records a redacted runtime-unavailable event instead of throwing an API error to the child.
3. **Given** a message that triggers app policy preflight, **When** the child sends it in real mode, **Then** Lenon returns the safety response without sending the raw text to Hermes inference.

---

### User Story 2 - Parent/Admin Can Audit Runtime Isolation (Priority: P1)

As a parent/admin operator, I can inspect each child runtime's mapping, reachability, container posture, disabled toolsets, provider route, and secret status without seeing any secret values.

**Why this priority**: A real child-agent architecture is not credible unless operators can see whether each child has an isolated runtime and whether unsafe surfaces are disabled.

**Independent Test**: Open `/admin/hermes/runtime-audit` in demo, missing-real, planned-real, and running-real states; the page shows an audit row per configured or expected child runtime with booleans/status only.

**Acceptance Scenarios**:

1. **Given** no real registry is configured, **When** an admin opens runtime audit in real mode, **Then** the audit still lists expected Lenon child agents with a missing-runtime failure check.
2. **Given** a planned runtime registry file exists, **When** an admin opens runtime audit, **Then** the audit shows registry source, redacted base URL, API key configured boolean, container status, and Hermes API reachability.
3. **Given** runtime secrets exist in environment variables or registry files, **When** audit JSON is returned, **Then** API keys, bearer tokens, raw registry JSON, and provider secrets are never returned.

---

### User Story 3 - Maintainer Can Provision And Verify A Local Runtime Contract (Priority: P2)

As a maintainer, I can run a local command to plan or provision one child Hermes runtime, verify the generated files and registry contract, and configure the model provider without committing secrets.

**Why this priority**: Local real-mode setup must be repeatable before production deployment hardening.

**Independent Test**: Run the runtime manager in plan mode using a temporary runtime root; verify it writes a per-child registry entry, child data directory, conservative config, and app env guidance without requiring Docker.

**Acceptance Scenarios**:

1. **Given** no Docker daemon is available, **When** the maintainer runs the runtime contract smoke, **Then** it validates plan-mode generated files without starting a container.
2. **Given** Docker and a provider are available, **When** the maintainer provisions a runtime with inference settings, **Then** the registry can point Lenon at a child-specific Hermes gateway backed by that configured provider.
3. **Given** generated runtime files include secrets, **When** files are written, **Then** they live only under `.local/` or a caller-provided runtime root ignored by git.

### Edge Cases

- Hermes registry file is missing, malformed, empty, or points to a stopped gateway.
- Hermes `/v1/models` is reachable but `/v1/responses` times out or returns an error.
- Runtime manager server is absent while real mode is enabled.
- A child profile exists in Lenon state but has no corresponding registry entry.
- Multiple children are configured and only one child runtime is offline.
- A child sends an app-policy-blocked message while Hermes is offline.
- The configured provider is installed/configured but the requested model is missing, unauthorized, quota-limited, or still loading.
- A developer asks to use OpenAI Codex OAuth credentials as a runtime default.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Real mode MUST resolve chat by `childProfileId -> hermesAgentId -> runtime registry entry`.
- **FR-002**: Child chat MUST call model inference only through the Hermes profile/gateway API path.
- **FR-003**: App policy preflight MUST run before Hermes inference and MUST skip inference for blocked or escalated messages.
- **FR-004**: If Hermes is missing, offline, slow, or errors, child chat MUST return a safe fallback response instead of a raw API failure.
- **FR-005**: Runtime audit MUST include configured registry runtimes and expected child agents missing registry runtimes.
- **FR-006**: Runtime audit MUST redact URLs, tokens, API keys, registry payloads, and provider secrets, exposing only booleans and status fields.
- **FR-007**: Runtime manager plan mode MUST generate one child runtime directory, registry entry, API key, policy metadata, SOUL, and conservative child config without requiring Docker.
- **FR-008**: Runtime manager Docker provision mode MUST bind the child gateway to loopback and avoid mounting Docker socket, host home directories, or shared child directories.
- **FR-009**: Runtime inference provider settings MUST be configurable through local/deployment configuration, not committed environment values.
- **FR-010**: The open-source default MUST NOT depend on OpenAI Codex OAuth, ChatGPT session caches, Codex access tokens, or any personal developer credential.
- **FR-011**: OpenAI Platform API keys, Codex access tokens, and ChatGPT-managed Codex OAuth credentials MAY be documented only as explicit operator-managed provider options where appropriate, never as Lenon's default child runtime credential.
- **FR-012**: Verification MUST include typecheck, build, a runtime contract smoke, and a touched-file secret scan.
### Key Entities

- **HermesRuntimeRegistryEntry**: Server-side runtime record keyed by `hermesAgentId`, containing child profile ID, profile name, redacted base URL for audit, API key for server-to-server calls, model alias, isolation mode, gateway mode, and optional container name.
- **ChildRuntimeAudit**: Redacted operator view of one expected or configured runtime, including reachability, container state, disabled toolsets, model/provider labels, secret booleans, and checks.
- **RuntimeFallbackEvent**: Policy event created when real runtime cannot answer an allowed child message.
- **RuntimeManagerPlan**: Local filesystem contract that writes `.local/hermes-runtimes/registry.json` plus child data/config files for one child.
- **InferenceProviderConfig**: Deployment-controlled model/provider settings such as provider ID, model name, OpenAI-compatible base URL, and credential source. The default committed repo state is unconfigured.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In real mode with no registry, `/api/admin/hermes/runtime-audit` returns at least one missing-runtime audit for seeded `child_ava`.
- **SC-002**: In real mode with an offline registry entry, child chat returns a safe fallback assistant message instead of HTTP 500.
- **SC-003**: In real mode with app-policy-blocked input, Lenon returns a policy response and does not call Hermes `/v1/responses`.
- **SC-004**: Runtime audit JSON contains `apiKeyConfigured` but contains no API key value or bearer token.
- **SC-005**: `npm run test:runtime`, `npm run typecheck`, and `npm run build` pass locally.
- **SC-006**: Runtime manager plan mode writes a registry, child runtime metadata, SOUL, policy, and conservative config under an ignored or temporary runtime root.

## Assumptions

- Real auth, hosted database persistence, and production orchestration are future features.
- Local MVP isolation is one Hermes container or gateway process per child profile.
- Hermes profile/gateway APIs remain server-to-server only and are never exposed directly to browsers.
- Ollama/Gemma, OpenAI Platform API-key, Bedrock, or other OpenAI-compatible provider configuration is optional deployment configuration and may be unavailable during CI or local smoke tests.
- OpenAI Codex OAuth is for Codex local tooling/workflows, not the default Lenon child runtime provider credential.
- AI SDK 7 is not required for this feature; it may be evaluated later as an internal Hermes adapter implementation detail only.
