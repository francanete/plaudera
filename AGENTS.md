# Repository Guidelines

This project is a Next.js 16 application with TypeScript, Drizzle ORM, and Vitest. Use this guide to keep contributions uniform, reviewable, and production-ready.

## Project Structure & Module Organization
- UI routes live in `src/app`, shared presentation in `src/components`, reusable hooks in `src/hooks`, and server logic (actions, db helpers) in `src/actions` and `src/lib`.
- Database schema, migrations, and seeds stay in `drizzle/`; static assets are under `public/`, while markdown or marketing copy belongs in `content/`.
- Tests mirror runtime code in `tests/<area>` so you can scan for coverage parity. Keep feature docs or RFCs in `docs/`.

## Build, Test, and Development Commands
- `npm run dev` spawns Next.js, Inngest, and the ngrok tunnel; prefer it when integrating webhooks.
- `npm run build` runs `db:migrate:deploy` then `next build`, so ensure pending migrations are committed.
- `npm run lint`, `npm run lint:fix`, `npm run format:check`, and `npm run format` enforce ESLint + Prettier.
- Database helpers: `npm run db:dev:up`, `db:dev:down`, and `db:dev:reset` manage the Dockerized Postgres instance; use `db:migrate`/`db:push` for schema changes.
- Testing: `npm run test` (watch), `test:run` (CI-friendly), and `test:coverage` (reports via V8).

## Coding Style & Naming Conventions
- TypeScript everywhere; stick to Prettier defaults (2-space indentation, single quotes via lint autofix) and avoid implicit `any`.
- React components are PascalCase, hooks start with `use`, server utilities in `src/lib` are camelCase verbs (e.g., `fetchMemberProfile`).
- Prefer composition over deeply nested conditionals; extract complex server logic into `src/actions/*` with clear input schemas (Zod is available).
- Run `npm run lint` before pushing to catch `eslint.config.mjs` + Tailwind plugin rules.

## Testing Guidelines
- Use Vitest with Testing Library (`tests/components/*` for UI, `tests/lib/*` for utilities). Name files `*.test.ts` or `*.test.tsx` alongside the mirrored path.
- Mock network or database access with lightweight fixtures; do not touch live services during unit tests.
- Aim for covering all exported functions plus happy and failure paths; surface notable gaps in the PR description.

## Commit & Pull Request Guidelines
- Recent history favors short, imperative messages (e.g., `Improve widget`); keep scope focused and mention issue IDs when applicable.
- Rebase before opening a PR, provide a concise summary, testing evidence, screenshots for UI, and call out schema or env changes.
- Confirm CI (lint + test) passes locally when the diff adds pages, migrations, or new workflows.

## Security & Configuration Tips
- Store secrets in `.env.local`; never commit them. Use the sample env file if available and document new keys in the PR.
- When touching webhooks or Inngest handlers, update `proxy.ts` or `docker/` configs as needed and describe required ingress steps.
