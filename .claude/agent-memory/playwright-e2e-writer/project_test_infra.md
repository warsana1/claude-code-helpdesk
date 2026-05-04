---
name: HelpDesk Playwright test infrastructure
description: Location and structure of Playwright config, global setup, test directory, auth state files, and test commands
type: project
---

## Config and setup

- `playwright.config.ts` at monorepo root — loads `apps/server/.env.test`, `testDir: "./tests"`, `globalSetup: "./playwright/global-setup.ts"`, `fullyParallel: false`, baseURL `http://localhost:5173`
- `playwright/global-setup.ts` — runs `prisma migrate deploy`, truncates all tables (session → account → verification → user), re-seeds via `bun prisma/seed.ts` and `bun prisma/seed-agent.ts`
- Tests live in `tests/`
- Storage state files written to `playwright/.auth/` (gitignored)

## Test commands (run from monorepo root)

```
bun test:e2e           # headless
bun test:e2e:ui        # Playwright UI mode
bun test:e2e:headed    # headed
```

## Seeded accounts (fresh each run)

| Email | Password | Role |
|---|---|---|
| admin@example.com | password123 | admin |
| agent@example.com | password123 | agent |

**Why:** Tests use a separate `helpdesk_test` database (pointed to by `apps/server/.env.test`) so the dev DB is never touched.

**How to apply:** Always reference the test DB for new test-related setup; never assume dev credentials.
