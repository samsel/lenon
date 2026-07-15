# Implementation Plan: Real Hermes Runtime

**Branch**: `003-real-hermes-runtime` | **Date**: 2026-07-14 | **Spec**: `specs/003-real-hermes-runtime/spec.md`

**Input**: Feature specification from `/specs/003-real-hermes-runtime/spec.md`

## Summary

Make Lenon's real Hermes mode credible and child-safe by tightening the existing Hermes client/runtime manager path: fail closed for offline runtimes, make inference provider configuration explicit and secret-free in the repo, audit missing and configured child runtimes without exposing secrets, and add a repeatable runtime contract smoke for local setup.

## Technical Context

**Language/Version**: TypeScript 5.7/Next.js 15/React 19 for app code; Node.js 20+ ESM for runtime scripts.

**Primary Dependencies**: Existing Next.js app, `@kidsafe/hermes-client`, `@kidsafe/shared`, Node built-ins. No AI SDK dependency for this feature.

**Storage**: In-memory demo/product state plus local runtime registry files under `.local/hermes-runtimes/` or caller-provided temp runtime roots.

**Testing**: `npm run test:runtime`, `npm run typecheck`, `npm run build`, touched-file secret scan.

**Target Platform**: Local developer machine running Next.js; optional Docker Desktop and operator-selected model provider for real runtime provisioning.

**Project Type**: Brownfield web app plus local runtime manager scripts.

**Performance Goals**: Child chat should not hang indefinitely when Hermes is slow; fallback should return after the server-side Hermes request timeout.

**Constraints**: No browser exposure of Hermes tokens; no app-layer direct model provider calls; no committed provider secrets; no default dependency on personal Codex OAuth/session credentials; one child maps to one isolated Hermes runtime identity.

**Scale/Scope**: Local MVP with one or more child profiles; production database/orchestration is out of scope.

## Constitution Check

- Child safety: PASS. Real-mode policy preflight and safe runtime fallback are required before inference.
- Hermes boundary: PASS. No UI/API route calls model providers directly.
- One child, one isolated agent identity: PASS. Registry and audit are keyed by `childProfileId` and `hermesAgentId`.
- Spec/tests before implementation: PASS. This feature includes spec, plan, contracts, tasks, and runtime smoke.
- Open-source hygiene: PASS. Runtime/provider secrets stay under `.local/`, local env, or secret managers and are scanned out of committed files.

## Project Structure

### Documentation (this feature)

```text
specs/003-real-hermes-runtime/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── runtime-api.md
└── tasks.md
```

### Source Code

```text
packages/hermes-client/src/index.ts
scripts/hermes/runtime-manager-lib.mjs
scripts/hermes/runtime-contract-smoke.mjs
apps/web/src/components/admin-app.tsx
docs/hermes-real-integration.md
docs/hermes-runtime-manager.md
package.json
```

**Structure Decision**: Extend the existing Hermes client and local runtime manager instead of introducing a second agent framework or model adapter.

## Complexity Tracking

No constitution violations.
