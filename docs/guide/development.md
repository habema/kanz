# Development

A pnpm workspace (Node 24; the pnpm version is pinned in `package.json`, so `corepack enable` picks it up).

| path | what |
|---|---|
| `apps/web` | React + Vite + Tailwind front end: main screen, admin, MC room, setup |
| `apps/api` | Express API; the live game and the configuration are one JSONB row each in Postgres |
| `lib/game-core` | Config types, board building, validation, `migrateConfig`, schedule generator, importers (vitest tests alongside) |
| `lib/api-spec` | OpenAPI spec, the source of the two generated packages below |
| `lib/api-client-react`, `lib/api-zod` | Generated React Query hooks and Zod schemas |
| `lib/db` | Drizzle schema |
| `docs` | This site (VitePress) |

## Commands

```sh
pnpm install
pnpm run typecheck                              # every package, tests included
pnpm run test
pnpm run lint                                   # ESLint
pnpm run format                                 # Prettier (format:check only checks)
pnpm run codegen                                # after editing openapi.yaml
pnpm --filter @kanz/docs dev               # this site, with live reload
```

## Running outside Docker

1. Point `DATABASE_URL` at a Postgres database and create the tables once: `pnpm --filter @kanz/db run push`.
2. Start the API on port 8080: `SESSION_SECRET=dev pnpm --filter @kanz/api run dev`.
3. Start the front end on port 5173 (it proxies `/api`): `pnpm --filter @kanz/web run dev`.

## API

`lib/api-spec/openapi.yaml` is the contract. `GET /api/game` (the main screen) and `/api/auth/*` (password and session) are public; every route under `/api/admin/` needs the session cookie and is checked once in `apps/api/src/routes/index.ts`. CI fails if the generated clients don't match the spec.

## Changing things safely

- **Live state** (`apps/api/src/lib/store.ts`): changing `LiveState`'s shape requires bumping `STATE_VERSION`. Old rows are then replaced: the password is kept and everything else resets. New *optional* fields don't need a bump.
- **Game configuration:** a change to `GameConfig` touches `lib/game-core/src/config.ts`, the `GameConfig` schema in `openapi.yaml` (then run codegen), `validateConfig` and the setup page together. Stored configs from older versions must still load. Every stored row, restored backup and onboarding draft passes through `migrateConfig`, so prefer optional fields, and convert old shapes there when one changes.
- **Running games:** while tiles have been played, the API refuses changes to `structureKey` (category ids, tile kinds and positions, team count). Text, points and media can change.
- **UI text** is Arabic only. Keep new strings Arabic and wrap team names in `<bdi>`.
