# HelpDesk — Project Memory

## Project Overview

AI-powered ticket management system. Agents handle support tickets; Claude API auto-classifies, summarizes, and suggests replies.

See `project-scope.md` for full feature list and `tech-stack.md` for technology choices.

## Monorepo Structure

```
HelpDesk/
├── apps/
│   ├── server/   # Express + TypeScript backend (port 3001)
│   └── client/   # React + Vite + Tailwind frontend (port 5173)
├── package.json  # Bun workspace root
└── tsconfig.base.json
```

## Dev Commands

```bash
bun dev:server        # start backend (hot-reload via --hot)
bun dev:client        # start frontend (Vite HMR)
bun dev               # start both in parallel
bun install           # install all workspace deps
bun test:e2e          # run Playwright tests (headless)
bun test:e2e:ui       # Playwright UI mode
bun test:e2e:headed   # Playwright headed mode
```

## Conventions

- Runtime: **Bun** (no Node/ts-node needed — Bun runs TypeScript natively)
- Backend entry: `apps/server/src/index.ts`
- API routes live in `apps/server/src/routes/`
- Frontend proxies `/api/*` to `http://localhost:3001` via Vite config
- Tailwind v4: no config file — just `@import "tailwindcss"` in `index.css`
- React Router v7: import from `react-router` (merged package, no `-dom` suffix)

## Documentation

Always use **Context7 MCP** to fetch up-to-date docs before writing code that involves any library or framework. Never rely solely on training data.

### Workflow

1. Call `resolve-library-id` with the library name and the current question
2. Pick the best match (highest benchmark score + source reputation)
3. Call `query-docs` with the selected library ID and the full question
4. If the answer is unsatisfactory, retry with `researchMode: true`
5. Write code using the fetched docs

### Key library IDs (pre-resolved)

| Library | Context7 ID |
|---|---|
| Bun | `/oven-sh/bun` |
| Express | `/expressjs/express` |
| Vite | `/vitejs/vite` |
| Prisma | resolve at query time |
| React Router | resolve at query time |
| Tailwind CSS | resolve at query time |
| Anthropic SDK | resolve at query time |
| Better Auth | resolve at query time |

## Authentication

Library: **Better Auth** (v1.x) — email/password only. Sign-up is **disabled** in the main auth config; only the seed script can create accounts.

### Key files

| File | Purpose |
|---|---|
| `apps/server/src/auth.ts` | Better Auth server instance — Prisma adapter, trusted origin, user role field |
| `apps/client/src/lib/auth-client.ts` | Better Auth React client — `signIn.email()`, `signOut()`, `useSession()` |

### Server wiring (`apps/server/src/index.ts`)

- `ALL /api/auth/*` → `toNodeHandler(auth)` (Better Auth handles all auth routes)
- `GET /api/me` → `requireAuth` middleware + returns `{ id, name, email, role }` only
- CORS origin driven by `CLIENT_ORIGIN` env var (defaults to `http://localhost:5173`)
- Rate limiting on `/api/auth/sign-in` — **production only** (`NODE_ENV=production`), 10 req / 15 min
- Server exits on startup if `BETTER_AUTH_SECRET` is missing

### Auth middleware (`apps/server/src/middleware/auth.ts`)

- `requireAuth` — reads session via Better Auth, stores in `res.locals.session`, returns 401 if missing
- `requireAdmin` — checks `session.user.role === "admin"`, returns 403 if not; must come after `requireAuth`

Apply to routes: `app.use("/api/route", requireAuth, router)` or `app.use("/api/admin/route", requireAuth, requireAdmin, router)`

### Session strategy

Database-backed sessions stored in the `Session` Prisma model. Sessions expire after **8 hours** and refresh after 1 hour of activity. The client reads the session on app load via `useSession()`; the app redirects to `/login` if no session is present.

### User roles

Defined as a Prisma enum: `admin` | `agent` (default). Stored on the `User` model as an additional Better Auth field.

### Typing additionalFields on the client

`session.user.role` requires the `inferAdditionalFields` plugin to be typed correctly on the client:

```ts
// apps/client/src/lib/auth-client.ts
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3001",
  plugins: [
    inferAdditionalFields({
      user: { role: { type: "string" } },
    }),
  ],
});
```

Add a matching entry here whenever a new `additionalField` is added to the server auth config.

### Role-based routing

Admin-only routes follow this pattern in `App.tsx`:

```tsx
<Route
  path="/users"
  element={
    !session ? <Navigate to="/login" replace /> :
    session.user.role === "admin" ? <UsersPage /> :
    <Navigate to="/" replace />
  }
/>
```

Admin-only nav links: `{session?.user.role === "admin" && <Link to="/users">Users</Link>}`

### Password hashing

Better Auth uses **scrypt** internally (via `@better-auth/utils`). All seed scripts and the password reset script must use:

```ts
import { hashPassword } from "@better-auth/utils/password";
const hash = await hashPassword(password);
```

Never use `Bun.password.hash()` (argon2id) — it is incompatible with Better Auth's verifier.

### Environment variables (server)

```
BETTER_AUTH_SECRET=   # secret key for signing sessions (required — server exits without it)
BETTER_AUTH_URL=http://localhost:3001
CLIENT_ORIGIN=http://localhost:5173  # drives CORS origin and trustedOrigins
DATABASE_URL=         # PostgreSQL connection string
SEED_ADMIN_EMAIL=     # used by prisma/seed.ts to create the initial admin
SEED_ADMIN_PASSWORD=  # used by prisma/seed.ts
```

See `apps/server/.env.example` for the full template.

### Creating / managing users

Sign-up is disabled at runtime. Use seed scripts to create accounts:

| Script | Purpose |
|---|---|
| `apps/server/prisma/seed.ts` | Creates admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars |
| `apps/server/prisma/seed-agent.ts` | Creates `agent@example.com` (duplicate to add more agents) |
| `apps/server/prisma/reset-admin-password.ts` | Resets admin password in the DB |

```bash
bun run apps/server/prisma/seed.ts                              # create/verify admin
bun run apps/server/prisma/seed-agent.ts                        # create agent@example.com
bun run apps/server/prisma/reset-admin-password.ts <password>   # reset admin password
```

### Seeded accounts

| Email | Password | Role |
|---|---|---|
| (value of `SEED_ADMIN_EMAIL`) | (value of `SEED_ADMIN_PASSWORD`) | admin |
| agent@example.com | password123 | agent |

## Database & Migrations

Prisma with PostgreSQL. Migrations live in `apps/server/prisma/migrations/`.

```bash
# Development
bunx --bun prisma migrate dev --name <name>   # create + apply a new migration
bunx --bun prisma db push                     # sync schema without migration files (avoid — breaks _prisma_migrations)

# All environments
bunx --bun prisma migrate deploy              # apply pending migrations (safe, non-destructive)
bunx --bun prisma studio                      # open Prisma Studio
```

**Always use `migrate deploy` not `db push`** — `db push` skips `_prisma_migrations` and will cause drift.

Three existing migrations:
1. `20260503140419_add_better_auth_tables`
2. `20260503221421_add_user_role`
3. `20260503222000_role_enum`

## Testing (Playwright)

E2E tests use a **separate `helpdesk_test` database** so the dev database is never touched.

### Setup files

| File | Purpose |
|---|---|
| `playwright.config.ts` | Loads `apps/server/.env.test`, starts server + client webServers, global setup |
| `playwright/global-setup.ts` | Runs `migrate deploy`, truncates all tables, seeds test users |
| `apps/server/.env.test` | Test-only env vars (gitignored — copy from `.env.test.example`) |
| `tests/` | Test files go here |

### How it works

1. `playwright.config.ts` loads `apps/server/.env.test` → `DATABASE_URL` points to `helpdesk_test`
2. Global setup applies pending migrations, clears all rows (FK-safe order), re-seeds admin + agent
3. Server webServer starts with test env vars overriding the dev `.env` (Bun respects pre-set env vars)
4. Tests run against `http://localhost:5173`

### Test database setup (first time / after recreating)

```bash
# Create the database (psql must be on PATH)
psql -U postgres -c "CREATE DATABASE helpdesk_test"

# Apply schema
DATABASE_URL="postgresql://..." bunx --bun prisma migrate deploy

# Seed
DATABASE_URL="..." SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=password123 \
  bun run apps/server/prisma/seed.ts
  bun run apps/server/prisma/seed-agent.ts
```

Stop your dev server before running `bun test:e2e` locally (`reuseExistingServer` is enabled).
