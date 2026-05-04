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
bun dev:server   # start backend (hot-reload via --hot)
bun dev:client   # start frontend (Vite HMR)
bun dev          # start both in parallel
bun install      # install all workspace deps
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
- `GET /api/me` → returns current user via `auth.api.getSession()`
- CORS configured for `http://localhost:5173` with credentials enabled

### Session strategy

Database-backed sessions stored in the `Session` Prisma model. The client reads the session on app load via `useSession()`; the app redirects to `/login` if no session is present.

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

### Environment variables (server)

```
BETTER_AUTH_SECRET=   # secret key for signing sessions
BETTER_AUTH_URL=http://localhost:3001
DATABASE_URL=         # PostgreSQL connection string
SEED_ADMIN_EMAIL=     # used by prisma/seed.ts to create the initial admin
SEED_ADMIN_PASSWORD=  # used by prisma/seed.ts
```

### Creating users

Sign-up is disabled at runtime. Use seed scripts to create accounts:

| Script | Purpose |
|---|---|
| `apps/server/prisma/seed.ts` | Creates the admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars |
| `apps/server/prisma/seed-agent.ts` | Template for creating agent users — duplicate and adjust as needed |

```bash
bun run apps/server/prisma/seed.ts        # create/verify admin
bun run apps/server/prisma/seed-agent.ts  # create agent@example.com
```

### Seeded accounts

| Email | Role |
|---|---|
| (value of `SEED_ADMIN_EMAIL`) | admin |
| agent@example.com | agent |
