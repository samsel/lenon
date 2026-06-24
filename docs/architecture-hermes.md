# Hermes Architecture Notes

The application is organized around a strict runtime boundary:

```txt
Parent and child UI
  -> Thin API gateway
  -> @kidsafe/hermes-client
  -> Hermes control plane / child-agent runtime
  -> Model provider behind Hermes
```

The local prototype includes a demo Hermes implementation in `packages/hermes-client/src/index.ts` so the app runs without external services. This is not an app-layer agent framework. It is the development stand-in for Hermes.

The real integration path uses one Hermes profile/API server per child profile. See `docs/hermes-real-integration.md`.

## Runtime Ownership

Hermes owns:

- One dedicated child profile runtime, represented by one Hermes profile/process per child in the MVP deployment
- Prompt stack assembly
- Parent policy overlays
- Skill permissions and runtime
- Input and output safety gates
- Time budget and checkpoint decisions
- Conversation state
- Eval execution
- Runtime and policy events

The product app owns:

- Parent/family/child metadata
- Child-to-Hermes-agent mapping
- UI state and cached summaries
- Marketplace catalog display
- Audit mirrors for parent/admin actions

## Implemented Route Surfaces

Parent:

- `/parent/home`
- `/parent/onboarding`
- `/parent/children/:childId`
- `/parent/children/:childId/hermes-agent`
- `/parent/children/:childId/policy`
- `/parent/children/:childId/skills`
- `/parent/children/:childId/activity`
- `/parent/children/:childId/conversations`
- `/parent/children/:childId/rewards`
- `/parent/alerts`
- `/parent/settings/privacy`

Child:

- `/child/login`
- `/child/home`
- `/child/chat`
- `/child/skills`
- `/child/skills/:skillId`
- `/child/rewards`
- `/child/break`
- `/child/ask-parent`

Admin:

- `/admin/home`
- `/admin/hermes/agents`
- `/admin/prompts`
- `/admin/skills/review`
- `/admin/conversations/flagged`
- `/admin/evals`
- `/admin/audit-logs`

Creator:

- `/creator/home`
- `/creator/skills`
- `/creator/skills/new`
- `/creator/docs`

## Demo Behaviors

- Creating a child profile provisions a new Hermes child agent.
- Policy edits call Hermes and update the active policy version.
- Skill install/uninstall calls Hermes and changes the agent's installed skill set.
- Child chat resolves the child profile to the Hermes agent server-side.
- Requests for private info, dangerous instructions, or bonus time are decided by the Hermes client.
- Checkpoints can grant parent-capped bonus time.
- Admin eval runs are created through Hermes.
