# Testing (Playwright)

E2E tests use a **separate `helpdesk_test` database** so the dev database is never touched.

## Setup files

| File | Purpose |
|---|---|
| `playwright.config.ts` | Loads `apps/server/.env.test`, starts server + client webServers, global setup |
| `playwright/global-setup.ts` | Runs `migrate deploy`, truncates all tables, seeds test users |
| `apps/server/.env.test` | Test-only env vars (gitignored — copy from `.env.test.example`) |
| `tests/` | Test files go here |

## How it works

1. `playwright.config.ts` loads `apps/server/.env.test` → `DATABASE_URL` points to `helpdesk_test`
2. Global setup applies pending migrations, clears all rows (FK-safe order), re-seeds admin + agent
3. Server webServer starts with test env vars overriding the dev `.env` (Bun respects pre-set env vars)
4. Tests run against `http://localhost:5173`

## Test database setup (first time / after recreating)

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

## Test commands

Run from the monorepo root:

```bash
bun test:e2e          # headless
bun test:e2e:ui       # Playwright UI mode
bun test:e2e:headed   # headed
```

## Test accounts

These are seeded fresh before every test run by `playwright/global-setup.ts`:

| Email | Password | Role |
|---|---|---|
| admin@example.com | password123 | admin |
| agent@example.com | password123 | agent |

## App routes

| Route | Description |
|---|---|
| `/login` | Login page — redirects to `/` if already authenticated |
| `/` | Home page — requires auth |
| `/users` | Admin-only page — non-admins redirected to `/` |

**Base URL**: `http://localhost:5173`

## Key UI elements (for writing selectors)

- Login form has email + password fields and a submit button
- NavBar shows username, "Sign out" button, and "Users" link (admin only)

## Notes for writing tests

- Tests run serially (`fullyParallel: false`) — the DB is shared
- Each full test run resets the database via global-setup, but individual tests do **not** reset between them — design tests to be independent or order-aware
- `storageState` can be used to persist login state across tests, avoiding repeated sign-in flows
