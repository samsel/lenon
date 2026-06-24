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
- Seed family, child profile, Hermes agent mapping, policies, skills, policy events, prompts, and evals
- Prisma schema matching the spec's product metadata tables

The demo Hermes backend is intentionally located behind the typed Hermes client package. It simulates Hermes for local development only. The app does not call an LLM provider, assemble prompts, execute skills, run evals, or enforce child safety in the app layer.

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

## Swap local demo Hermes for real Hermes

Replace the implementation inside `packages/hermes-client/src/index.ts` with real Hermes SDK/API calls while preserving the exported method names used by the app:

- `provisionChildAgent`
- `updatePolicy`
- `startChildSession`
- `sendChildMessage`
- `installSkill`
- `uninstallSkill`
- `submitCheckpoint`
- `runEval`

The route handlers in `apps/web/src/app/api/[[...path]]/route.ts` should remain thin wrappers.
