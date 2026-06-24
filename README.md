# KidSafe Hermes Runtime

KidSafe Hermes Runtime is a prototype child-safe AI assistant platform built around Hermes as the explicit backend harness. Each child gets a dedicated vertically isolated Hermes agent that powers a ChatGPT-like mobile experience. Parents use a web control panel to configure policies, skills, time limits, learning checkpoints, and visibility. Skills run inside Hermes with declared permissions and evals. Admins inspect Hermes agents, manage prompt versions, review marketplace skills, and run safety regressions. The project demonstrates applied AI product architecture, child safety, system prompting, agent isolation, marketplace governance, and eval-driven engineering.

## What is implemented

- Parent control panel routes under `/parent/*`
- Child mobile-web routes under `/child/*`
- Admin routes under `/admin/*`
- Creator routes under `/creator/*`
- Thin API gateway under `/api/*`
- Shared product and Hermes types
- Local Hermes demo backend through `@kidsafe/hermes-client`
- Real Hermes profile API mode via `HERMES_RUNTIME_MODE=real`
- Seed family, child profile, Hermes agent mapping, policies, skills, policy events, prompts, and evals
- Prisma schema matching the spec's product metadata tables

The demo Hermes backend is intentionally located behind the typed Hermes client package. It simulates Hermes for local development only. The app does not call an LLM provider directly. In real mode, child chat calls the configured child Hermes profile's `/v1/responses` endpoint server-to-server.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful routes:

- `http://localhost:3000/parent/home`
- `http://localhost:3000/parent/onboarding`
- `http://localhost:3000/parent/children/child_ava/policy`
- `http://localhost:3000/child/home`
- `http://localhost:3000/child/chat`
- `http://localhost:3000/admin/home`
- `http://localhost:3000/creator/home`

## Verify

```bash
npm run typecheck
npm run build
```

## Hermes boundary

The product app may store parent account metadata, family metadata, child profile metadata, Hermes agent mappings, UI preferences, marketplace catalog mirrors, cached summaries, and audit mirrors.

Hermes remains the source of truth for:

- Agent provisioning and isolation
- Prompt stacks and prompt versions
- Parent policy overlays
- Safety gate decisions
- Skill runtime and permissions
- Conversation runtime
- Time, rewards, and checkpoints
- Event logs and eval runs
- Model routing behind Hermes

Provider secrets such as `OPENAI_API_KEY` do not belong in this app. Model provider keys should live in Hermes configuration.

## Use Real Hermes

Real Hermes uses profiles as the isolation primitive. For this product, one child should map to one Hermes profile and one dedicated API server process.

Read [docs/hermes-real-integration.md](docs/hermes-real-integration.md), then set:

```bash
HERMES_RUNTIME_MODE=real
HERMES_PROFILE_REGISTRY='{"hermes_profile_child_ava":{"profileName":"child_ava","baseUrl":"http://127.0.0.1:8643","apiKey":"...","modelName":"child_ava"}}'
```

Provision a child profile:

```bash
npm run hermes:provision-child -- --child-id child_ava --nickname Ava --age-band 9-12 --profile child_ava --port 8643 --execute
```

The existing Hermes client methods remain the app boundary:

- `provisionChildAgent`
- `updatePolicy`
- `startChildSession`
- `sendChildMessage`
- `installSkill`
- `uninstallSkill`
- `submitCheckpoint`
- `runEval`

The route handlers in `apps/web/src/app/api/[[...path]]/route.ts` should remain thin wrappers.
