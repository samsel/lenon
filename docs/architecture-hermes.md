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

The real integration path uses one Hermes runtime per child profile. The local MVP path provisions one Docker container per child through the Runtime Manager, and the app reads the generated profile registry file. See `docs/hermes-runtime-manager.md` and `docs/hermes-real-integration.md`.

## Runtime Ownership

Hermes owns:

- One dedicated child profile runtime, represented by one Hermes Docker container per child in the local MVP deployment
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

## Runtime Manager

The local Runtime Manager owns Docker operations. The app should not mount or receive the Docker socket.

```txt
Thin API gateway
  -> @kidsafe/hermes-client
  -> HERMES_PROVISIONER_URL
  -> Runtime Manager
  -> Docker daemon
  -> Hermes child container
```

The generated `HERMES_PROFILE_REGISTRY_FILE` is the bridge back to the app. It maps `hermes_profile_child_ava` to the child runtime's loopback API URL and server-side API key.

Production can replace the Docker manager with ECS/Fargate tasks, Kubernetes Pods, or Nomad jobs behind the same provision/start/stop/status/destroy interface.
