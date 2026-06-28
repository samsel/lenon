# Feature Specification: Current Lenon Product Baseline

**Feature Branch**: `002-product-baseline`

**Created**: 2026-06-26

**Status**: Baseline

**Input**: User description: "Capture current Lenon product behavior as the baseline source of truth for future feature changes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Child Uses Lenon Safely (Priority: P1)

As a child, I can open Lenon, chat, choose approved skill worlds, play Math Quest, build a story, view rewards, take a break, or ask a grown-up for help inside a child-friendly mobile shell.

**Why this priority**: The child experience is the core product surface and must remain coherent, safe, and usable.

**Independent Test**: Navigate to `/child/home`, `/child/chat`, `/child/skills`, `/child/math-quest`, `/child/story-builder`, and `/child/rewards`; each route loads with the Lenon shell and no raw unstyled fallback.

**Acceptance Scenarios**:

1. **Given** Ava opens `/child/home`, **When** the page loads, **Then** Lenon displays a styled child shell, greeting, session/XP/skills metrics, and approved skill entry points.
2. **Given** Ava opens `/child/chat`, **When** she sends a normal learning question, **Then** Lenon routes the message through the child chat API and displays an assistant reply.
3. **Given** Ava enters private information in chat, **When** the client safety gate catches it, **Then** Lenon shows the safety catch overlay, does not display/store the raw private text, and creates a redacted safety event.
4. **Given** Ava opens Math Quest, **When** she selects the correct answer to a visible problem, **Then** the star count and trail progress advance.
5. **Given** Ava opens Story Builder, **When** Hermes is slow or unavailable, **Then** Lenon provides a safe fallback story page instead of leaving the child stuck.

---

### User Story 2 - Parent Governs Lenon (Priority: P1)

As a parent, I can see the family overview, configure policy, approve skills, review activity summaries, inspect safety alerts, and understand the Lenon/Hermes runtime status.

**Why this priority**: Lenon must be parent-governed; child autonomy depends on visible, understandable parent controls.

**Independent Test**: Navigate to `/parent/home`, `/parent/children/child_ava/policy`, `/parent/children/child_ava/skills`, `/parent/children/child_ava/activity`, and `/parent/alerts`; each route loads data and styled controls.

**Acceptance Scenarios**:

1. **Given** a parent opens `/parent/home`, **When** the page loads, **Then** family metrics, child profile status, and runtime map are visible.
2. **Given** a policy change is saved, **When** the parent submits the policy form, **Then** the update is pushed to the Hermes policy overlay path.
3. **Given** a child-side safety catch occurs, **When** the parent opens alerts or activity, **Then** a redacted safety event and incremented redirect count are visible.

---

### User Story 3 - Admin Reviews Runtime And Safety (Priority: P2)

As an admin or safety reviewer, I can inspect Lenon agents, runtime audit status, policy events, prompt/eval surfaces, and skill review queues without exposing secrets.

**Why this priority**: Runtime integrity and safety review are necessary for child-safe AI operations.

**Independent Test**: Navigate to `/admin/home`, `/admin/hermes/agents`, `/admin/hermes/runtime-audit`, `/admin/conversations`, `/admin/evals`, and `/admin/prompts`; surfaces load and runtime audit redacts secrets.

**Acceptance Scenarios**:

1. **Given** an admin opens `/admin/home`, **When** the page loads, **Then** metrics show agents, policy events, evals, and active prompts.
2. **Given** an admin opens runtime audit, **When** audit data loads, **Then** it reports reachability, container state, disabled toolsets, and secret booleans only.
3. **Given** policy events exist, **When** flagged conversations or audit logs are opened, **Then** event summaries are visible without raw child private text.

---

### User Story 4 - Creator Builds Governed Skills (Priority: P3)

As a skill creator, I can inspect the skill catalog, draft manifests, and read creator docs that explain Lenon's runtime and review boundaries.

**Why this priority**: A governed skill ecosystem is part of the product direction, but it is secondary to child and parent safety.

**Independent Test**: Navigate to `/creator/home`, `/creator/skills`, `/creator/skills/new`, and `/creator/docs`; each route loads styled creator surfaces.

**Acceptance Scenarios**:

1. **Given** a creator opens `/creator/home`, **When** the page loads, **Then** catalog metrics and skill workflow links are visible.
2. **Given** a creator opens the manifest editor, **When** the page loads, **Then** fields for skill name, category, prompt layer, eval suites, and permissions are visible.

### Edge Cases

- If the local Hermes runtime is slow, Story Builder must produce a safe fallback page.
- If the dev server cache is stale after a production build, the server must be restarted before browser verification.
- If existing in-memory product state lacks a new field, store migration/defaulting must keep API routes working.
- If a child sends private data, raw private text must not appear in the child transcript, parent alert, admin event, or product store event.
- If a skill is not installed for a child, the child sees it as locked and is routed to ask a grown-up.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Product-facing surfaces MUST brand the app as Lenon.
- **FR-002**: Hermes MUST remain the internal runtime/gateway/policy/eval boundary.
- **FR-003**: Child routes MUST render in the Lenon mobile shell with stable responsive layout.
- **FR-004**: Child chat MUST start or reuse a child session and call `/api/child/chat` for allowed messages.
- **FR-005**: Client-side safety catch MUST detect obvious PII/self-harm/blocked-topic requests before model inference where possible.
- **FR-006**: Safety catch MUST log a redacted `/api/child/safety-event` event and must not send raw blocked text to `/api/child/chat`.
- **FR-007**: Math Quest MUST generate client-consistent math problems and advance progress on correct answers.
- **FR-008**: Story Builder MUST call the Hermes child chat path for story generation and provide a safe timeout fallback.
- **FR-009**: Parent surfaces MUST display child policy, skills, activity, alerts, and runtime mapping.
- **FR-010**: Admin runtime audit MUST redact secrets and report status booleans, not raw keys.
- **FR-011**: Creator surfaces MUST present skill governance, manifest, and review concepts without enabling direct child monetization.
- **FR-012**: Shared seed data MUST reflect the Lenon product language while preserving Hermes runtime identifiers where technically relevant.

### Key Entities

- **ChildProfile**: Child identity and profile metadata, including age band, reading level, interests, learning goals, and login code.
- **HermesAgentMapping**: Runtime mapping from child profile to isolated Hermes child-agent identity.
- **ParentPolicyCache**: Parent-controlled policy overlay synchronized to Hermes.
- **Skill**: Governed capability package installed per child.
- **PolicyEvent**: Redacted safety/runtime event visible to parent/admin surfaces.
- **ChatMessage**: Child/assistant/system message object for allowed chat transcript entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run typecheck` passes.
- **SC-002**: `npm run build` passes.
- **SC-003**: Browser smoke confirms `/child/home` loads with styled Lenon shell and no empty-state error.
- **SC-004**: Browser smoke confirms safety catch displays a gentle reply and raw private text is absent after catch.
- **SC-005**: API smoke confirms redacted safety events appear in family and admin overview responses.
- **SC-006**: Runtime audit smoke confirms local child runtime reachability and secret redaction when local runtime is configured.

## Assumptions

- The current baseline is a local/open-source development system, not a full production deployment.
- Real auth, hosted database, production monitoring, and hardened multi-tenant permissions are future features, not part of this baseline.
- Local Hermes/Ollama runtime may be present; where absent or slow, product flows should degrade safely.
- This baseline documents current behavior after the Lenon redesign commit and will be updated or superseded by future feature specs.
