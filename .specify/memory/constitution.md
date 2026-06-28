# Lenon Constitution

## Core Principles

### I. Child Safety Is Non-Negotiable
Lenon is child-safety-first software. Any feature that touches child input, model output, parent controls, safety review, or runtime policy MUST define age-appropriate behavior, unsafe-content handling, privacy boundaries, and parent/admin visibility before implementation starts. Raw child private data, unsafe prompts, and blocked text MUST NOT be stored or displayed unless a spec explicitly proves the safety need and minimization boundary. Client-side safety catches are defense in depth only; server-side Hermes policy gates remain authoritative.

### II. Hermes Is The Runtime Boundary
Lenon product surfaces MUST NOT call model providers directly. Child chat, skill behavior, story generation, evals, runtime audits, and safety policy enforcement MUST route through the Hermes client/gateway path or an explicit test/mock contract. Any bypass of Hermes requires a new spec, a documented threat model, and a review decision before code changes. Runtime audit responses MUST expose booleans and redacted status only, never API keys, raw registry values, or provider secrets.

### III. One Child, One Isolated Agent Identity
Each child profile MUST map to exactly one active Lenon/Hermes child-agent identity at a time. Agent state, policy overlays, installed skills, memory scope, audit events, and runtime health MUST be scoped by `childProfileId` and `hermesAgentId`. Cross-child state sharing, shared memory, or multiplexed runtime behavior is prohibited unless the feature spec proves isolation and reviewability.

### IV. Spec And Tests Before Meaningful Implementation
Every meaningful feature or behavior change MUST start from a Spec Kit feature directory under `specs/`. The feature `spec.md` defines intended behavior; `plan.md` and `tasks.md` are derived implementation artifacts. Acceptance criteria MUST be testable. Browser-facing flows require Playwright coverage or a documented manual browser smoke when automation is not yet installed. Shared logic requires unit coverage where practical. API changes require contract updates or a documented temporary exception.

### V. Open-Source Hygiene And Least Data
Lenon is open source. The repository MUST NOT contain secrets, child personal data, provider keys, private registry values, or environment-specific credentials. Examples and docs MUST use placeholders. Logs and policy events MUST prefer redacted summaries over raw child content. New dependencies, generated assets, and large files MUST be justified in the spec or plan.

## Technology And Product Constraints

- Product-facing brand is Lenon. Hermes is the internal runtime, gateway, policy, and eval layer and should be visible mainly in operator/runtime contexts.
- Current app stack is Next.js/React/TypeScript in `apps/web`, shared domain types/seeds in `packages/shared`, Hermes client/runtime code in `packages/hermes-client` and `scripts/hermes`.
- UI changes MUST preserve the Lenon design language: structured editorial layout, restrained operator surfaces, stable responsive dimensions, and no raw unstyled fallback pages.
- Safety-sensitive features MUST include parent/admin review implications and event visibility.
- Local runtime mode may use Docker and Ollama, but specs MUST distinguish local/demo behavior from production requirements.
- Accessibility basics are required for user-facing flows: labeled inputs, navigable controls, non-overlapping text, and readable responsive states.

## Spec Persistence And Workflow

- Lenon uses **Living Spec** for active product behavior: update `spec.md` first when intended behavior changes, then update or regenerate `plan.md` and `tasks.md`.
- Lenon uses **Flow-Forward Spec** for major security/runtime decisions: create a new feature directory or ADR-style artifact when a substantial architecture decision supersedes prior behavior.
- Before implementation: run the Spec Kit flow through specify, clarify when ambiguous, plan, checklist, tasks, and analyze.
- After implementation: run converge and the project verification commands. If converge appends tasks, complete them or explicitly defer them in the feature artifact.
- Commits for meaningful features SHOULD include spec artifacts, tests/contracts, and implementation together so history explains both the intent and the code.

## Quality Gates

- Required local gates for normal code changes: `npm run typecheck`, relevant tests, `npm run build`, and browser smoke for affected UI routes.
- Safety/runtime changes additionally require a redaction check, a secrets scan over touched files, and verification that unsafe child text is not sent to model inference when a preflight gate is expected to catch it.
- API changes require a documented route contract in the feature `contracts/` directory until the project has a canonical OpenAPI contract.
- Specs MUST state assumptions and edge cases. Ambiguous safety, privacy, or runtime isolation requirements block implementation until clarified.

## Governance

This constitution supersedes ad-hoc prompts, implementation plans, and generated tasks. Any conflict between a feature artifact and this constitution MUST be resolved in favor of the constitution unless the constitution is formally amended. Amendments require a documented rationale, migration notes for existing specs if affected, and a version bump.

**Version**: 1.0.0 | **Ratified**: 2026-06-26 | **Last Amended**: 2026-06-26
