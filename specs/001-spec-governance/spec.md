# Feature Specification: Spec-Driven Governance

**Feature Branch**: `001-spec-governance`

**Created**: 2026-06-26

**Status**: Baseline

**Input**: User description: "Install/init GitHub Spec Kit with Codex integration, write the Lenon constitution, and use Spec Kit feature directories as the source of truth."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initialize Spec Kit For Lenon (Priority: P1)

As a Lenon maintainer, I need the repository initialized with GitHub Spec Kit so future feature work follows a repeatable spec -> plan -> tasks -> implement -> converge workflow instead of ad-hoc implementation.

**Why this priority**: Without the tool scaffold, future specs and agent workflows will be inconsistent and easy to bypass.

**Independent Test**: From the repository root, verify `.specify/`, `.agents/skills/speckit-*`, and `AGENTS.md` exist and Spec Kit scripts are available.

**Acceptance Scenarios**:

1. **Given** a clean Lenon repository, **When** Spec Kit is initialized with Codex skills, **Then** `.specify/` and `.agents/skills/` contain the generated workflow files.
2. **Given** a future Codex session in this repository, **When** the maintainer asks for Spec Kit workflow help, **Then** the installed `$speckit-*` skills are available for use.

---

### User Story 2 - Establish Lenon Constitution (Priority: P1)

As a Lenon maintainer, I need a constitution that records non-negotiable project principles for child safety, Hermes runtime boundaries, isolated child agents, testing, and open-source hygiene.

**Why this priority**: The constitution is the durable governance layer that future feature specs, plans, and tasks must obey.

**Independent Test**: Read `.specify/memory/constitution.md` and confirm it contains actionable Lenon-specific principles, constraints, workflow rules, and quality gates.

**Acceptance Scenarios**:

1. **Given** a future feature touches child input, **When** its spec is drafted, **Then** it must account for child safety, privacy, parent/admin visibility, and Hermes policy gates.
2. **Given** a future runtime feature is proposed, **When** it is planned, **Then** it must preserve the Hermes-only model/runtime boundary and child-agent isolation rules.

---

### User Story 3 - Use Spec Directories As Source Of Truth (Priority: P2)

As a Lenon maintainer, I need feature directories under `specs/` to be the canonical place for intended behavior, rather than scattered one-off markdown files.

**Why this priority**: Future code changes need traceability from product intent to tasks, tests, and implementation.

**Independent Test**: Confirm `specs/README.md` explains the convention and initial feature directories exist for governance and product baseline.

**Acceptance Scenarios**:

1. **Given** a new meaningful Lenon behavior change, **When** work begins, **Then** a Spec Kit feature directory must be created or updated first.
2. **Given** a reviewer wants to understand why a behavior exists, **When** they inspect `specs/`, **Then** the relevant feature spec explains the intended behavior and acceptance criteria.

### Edge Cases

- If a small typo or purely mechanical refactor does not change behavior, it may skip new feature specs but must not contradict existing specs.
- If implementation discovers that a spec is wrong or incomplete, update the spec before continuing or document why the behavior is deferred.
- If a feature is safety-critical and ambiguous, implementation is blocked until clarification occurs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain a Spec Kit initialization in `.specify/`.
- **FR-002**: The repository MUST contain Codex-compatible Spec Kit skills under `.agents/skills/`.
- **FR-003**: The repository MUST contain a Lenon-specific constitution at `.specify/memory/constitution.md`.
- **FR-004**: The repository MUST contain a `specs/` directory with feature directories for initial governance and product baseline.
- **FR-005**: The constitution MUST define child safety, Hermes runtime boundary, child-agent isolation, spec/test workflow, open-source secret hygiene, and quality gates.
- **FR-006**: The spec convention MUST state that `spec.md` is the source of truth and plans/tasks are derived artifacts.

### Key Entities

- **Constitution**: Durable project rules that supersede ad-hoc prompts and generated plans.
- **Feature Directory**: Spec Kit folder containing `spec.md` and derived artifacts for one feature or behavior set.
- **Living Spec**: Active product behavior contract updated before code changes.
- **Flow-Forward Spec**: Historical feature artifact used for major security/runtime decisions and superseding changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Spec Kit generated project files are present and version controlled.
- **SC-002**: The Lenon constitution has no unresolved template placeholders.
- **SC-003**: At least two initial feature directories exist under `specs/`.
- **SC-004**: Future contributors can identify the source-of-truth rule by reading `specs/README.md` and the constitution.

## Assumptions

- Lenon is an existing brownfield repository, so initial specs capture current behavior and governance rather than generating a new app from scratch.
- Spec Kit core will control the workflow; Playwright, Vitest, OpenAPI, and other tools will be added through future feature specs.
- Codex skills are the preferred integration for this local development workflow.
