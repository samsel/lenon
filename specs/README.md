# Lenon Spec Kit Source Of Truth

This directory is the canonical home for Lenon feature behavior.

## Rules

- Each meaningful feature or behavior change gets a Spec Kit feature directory: `###-short-name/`.
- `spec.md` is the source of truth for intended product behavior.
- `plan.md`, `tasks.md`, `research.md`, `quickstart.md`, and `contracts/` are derived artifacts created or updated by the Spec Kit workflow.
- Active product behavior uses the Living Spec model: update `spec.md` first, then update plan/tasks/tests.
- Major security and runtime architecture changes use Flow-Forward specs: create a new feature directory that links to or supersedes prior behavior.
- Tests and implementation must trace back to user stories, functional requirements, or success criteria in the relevant feature spec.

## Initial Baselines

- `001-spec-governance`: establishes Spec Kit and Lenon's SDD workflow.
- `002-product-baseline`: captures the current shipped Lenon behavior so future changes have a baseline contract.

## Legacy Material

- `docs/legacy/kidsafe-hermes-runtime-spec-v0.2.md` is archived historical context from the pre-Lenon naming era. It is not the active source of truth.
