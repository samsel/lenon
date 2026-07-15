# Tasks: Real Hermes Runtime

**Input**: Design documents from `/specs/003-real-hermes-runtime/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/runtime-api.md`

**Tests**: Include runtime contract smoke, typecheck, build, and secret scan.

## Phase 1: Setup

- [x] T001 Create `specs/003-real-hermes-runtime/` using Spec Kit feature numbering.
- [x] T002 Replace placeholder spec with Lenon-specific real runtime user stories and requirements.
- [x] T003 Add plan, research, data model, quickstart, contracts, and task artifacts.

## Phase 2: Foundational

- [x] T004 Add a no-Docker runtime contract smoke in `scripts/hermes/runtime-contract-smoke.mjs`.
- [x] T005 Add `npm run test:runtime` to `package.json`.
- [x] T006 Update runtime docs to point at the new smoke and safe-fallback behavior.
- [x] T006a Document configurable inference providers and explicitly reject OpenAI Codex OAuth as the default runtime credential.

## Phase 3: User Story 1 - Child Uses A Real Hermes Runtime Safely (P1)

**Goal**: Allowed child chat uses real Hermes when reachable and safe fallback when unreachable.

**Independent Test**: In real mode with an offline registry entry, `/api/child/chat` returns an assistant fallback instead of a server error.

- [x] T007 Update `packages/hermes-client/src/index.ts` so real-mode health reports degraded instead of throwing when configured runtimes are unreachable.
- [x] T008 Update `packages/hermes-client/src/index.ts` so app policy detection runs before storing/sending blocked raw text.
- [x] T009 Update `packages/hermes-client/src/index.ts` so real-mode chat catches missing/offline/timeout failures and returns a redacted fallback response.

## Phase 4: User Story 2 - Parent/Admin Can Audit Runtime Isolation (P1)

**Goal**: Runtime audit shows configured and missing expected runtimes without secrets.

**Independent Test**: In real mode with no registry, `/api/admin/hermes/runtime-audit` lists `child_ava` as missing runtime.

- [x] T010 Add missing-runtime audit rows in `packages/hermes-client/src/index.ts`.
- [x] T011 Ensure audit responses expose booleans/status only for secrets.
- [x] T012 Improve `apps/web/src/components/admin-app.tsx` empty-state handling for audit rows with no toolsets.

## Phase 5: User Story 3 - Maintainer Can Provision And Verify A Local Runtime Contract (P2)

**Goal**: Maintainers can validate generated runtime files without Docker.

**Independent Test**: `npm run test:runtime` passes on a clean machine without Docker.

- [x] T013 Validate runtime manager plan output in `scripts/hermes/runtime-contract-smoke.mjs`.
- [x] T014 Verify generated config disables risky child toolsets and avoids Docker socket mounts.

## Phase 6: Verification

- [x] T015 Run `npm run test:runtime`.
- [x] T016 Run `npm run typecheck`.
- [x] T017 Run `npm run build`.
- [x] T018 Run secret scan over touched files.
- [x] T019 Run `git diff --check`.
- [x] T020 Run live real-mode API smoke for missing-runtime audit, child fallback, and policy preflight skip.
