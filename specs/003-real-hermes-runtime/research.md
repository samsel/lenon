# Research: Real Hermes Runtime

## Decision: Do not add AI SDK 7 for this feature

**Rationale**: Lenon's constitution requires Hermes to remain the runtime/model/policy boundary. AI SDK 7 may be useful later inside a Hermes adapter, but adding it now would risk a parallel app-layer model runtime before the Hermes integration is hardened.

**Alternatives considered**:

- Add AI SDK directly to the Next.js child chat route: rejected because it bypasses Hermes.
- Add AI SDK inside `packages/hermes-client`: deferred because current real mode already speaks Hermes `/v1/responses` and `/v1/models`.

## Decision: Make provider configuration explicit, but do not default to OpenAI Codex OAuth

**Rationale**: Lenon is open source and child-facing. The default committed repo state must not depend on a developer's ChatGPT/Codex login, Codex OAuth cache, Codex access token, or any personal credential. Official OpenAI Codex docs describe ChatGPT sign-in and API-key sign-in for Codex clients, and the advanced CI/CD guidance says API keys are the right default for automation while ChatGPT-managed Codex auth files are trusted-private-workflow credentials that must not be used in public/open-source repos.

**Default**: no provider credential configured in committed files. Real runtime setup must be configured by the operator through local env, `.local/` generated files, or a secret manager.

**Provider options to document**:

- Local Ollama through an OpenAI-compatible base URL.
- OpenAI Platform API key through deployment secrets if Hermes is configured to use OpenAI directly.
- OpenAI Codex access token or ChatGPT-managed Codex auth only for trusted local Codex workflows, not as Lenon's default runtime provider credential.

**Alternatives considered**:

- Default to OpenAI Codex OAuth: rejected because it is a personal/local tooling credential, not a portable child-product runtime default.
- Default to Ollama only: rejected because operators may use Ollama, OpenAI Platform, Bedrock, or another Hermes-supported provider.
- Commit placeholder provider secrets: rejected by the open-source hygiene principle.

## Decision: Fail closed with a child-safe fallback when Hermes is unavailable

**Rationale**: Children should never see stack traces, API errors, provider details, or raw runtime failures. A safe fallback preserves UX while making runtime failure visible to parent/admin audit surfaces.

**Alternatives considered**:

- Return HTTP 500 to child UI: rejected as unsafe and brittle.
- Silently switch to demo LLM behavior: rejected because it hides real-runtime failure.

## Decision: Audit missing expected runtimes, not only configured registry entries

**Rationale**: In real mode, an empty registry is itself an operator problem. Admin audit should report expected child agents that lack configured runtime entries.

**Alternatives considered**:

- Return an empty audit list: rejected because it makes missing runtime look like no work is needed.

## Decision: Add a no-Docker runtime contract smoke

**Rationale**: Local and CI verification need a deterministic check that does not require Docker, Hermes, Ollama, or secrets. Plan mode can validate the filesystem/registry contract safely.

**Alternatives considered**:

- Only manual Docker test: rejected because it is too environment-dependent.
