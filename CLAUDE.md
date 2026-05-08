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
├── packages/
│   └── core/     # Shared schemas, types, and utilities
├── package.json  # Bun workspace root
└── tsconfig.base.json
```

### `packages/core`

Shared code used by both `server` and `client`. Add code here when it needs to be consumed from both apps.

Currently contains:
- `src/schemas/users.ts` — Zod schemas and inferred types for user operations

Both apps reference it as `@helpdesk/core` via `"workspace:*"` in their `package.json`.

**Defining a shared Zod schema:**

```ts
// packages/core/src/schemas/foo.ts
import { z } from "zod";

export const createFooSchema = z.object({ ... });
export type CreateFooInput = z.infer<typeof createFooSchema>;
```

Re-export from `packages/core/src/index.ts`:
```ts
export * from "./schemas/foo";
```

**Using in server** (`@helpdesk/core` is already a dep):
```ts
import { createFooSchema } from "@helpdesk/core";
const result = createFooSchema.safeParse(req.body);
```

**Using in client** (`@helpdesk/core` is already a dep):
```ts
import { createFooSchema, type CreateFooInput } from "@helpdesk/core";
useForm<CreateFooInput>({ resolver: zodResolver(createFooSchema) });
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

## Error Handling (server)

A global `ErrorRequestHandler` in `apps/server/src/index.ts` (registered last, after all routes) handles known error types:
- `Prisma.PrismaClientKnownRequestError` with code `"P2002"` → 409
- Everything else → 500 + `console.error`

For database operations that can produce expected errors (unique constraints, etc.), wrap only the DB call in try/catch and forward to the global handler with `next(err)`:

```ts
router.post("/", async (req, res, next) => {
  // validation, hashing, etc. — no try/catch needed
  try {
    const result = await prisma.foo.create({ ... });
    res.status(201).json(result);
  } catch (err) {
    next(err); // global handler maps P2002 → 409, rest → 500
  }
});
```

Express 5 automatically forwards unhandled async rejections, but explicit `next(err)` is more reliable under Bun and makes the intent clear.

**Express 5 wildcard routes** require a named parameter — use `/*path` not `/*`:
```ts
app.all("/api/auth/*path", handler); // ✓ Express 5
app.all("/api/auth/*", handler);     // ✗ throws PathError at startup
```

## API Validation (server)

Use **Zod** for all request body validation in Express route handlers. Never write manual `if (!field)` checks.

Pattern:

```ts
import { z } from "zod";

const createFooSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  email: z.string().email("Enter a valid email address."),
});

router.post("/", async (req, res) => {
  const result = createFooSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: result.error.issues[0].message });

  const { name, email } = result.data;
  // ...
});
```

- Return the first issue message as `{ error: string }` with a `400` status
- Define schemas at the top of the route file, named `<action><Resource>Schema`
- `zod` is installed in `@helpdesk/server`

## Data Fetching (client)

- Use **axios** for all HTTP requests — never raw `fetch`
- Use **TanStack Query** (`@tanstack/react-query`) for all server state — no manual `useState`/`useEffect` for API calls
- `QueryClientProvider` is set up in `apps/client/src/main.tsx`
- Always pass `{ withCredentials: true }` to axios so session cookies are sent

Pattern:

```ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchItems(): Promise<Item[]> {
  const { data } = await axios.get<Item[]>("/api/items", { withCredentials: true });
  return data;
}

const { data, isPending, isError } = useQuery({ queryKey: ["items"], queryFn: fetchItems });
```

## Forms (client)

Use **React Hook Form** + **Zod** for all forms. Both are installed in `@helpdesk/client`.

```ts
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type FormValues = z.infer<typeof schema>;

const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
  useForm<FormValues>({ resolver: zodResolver(schema) });
```

- Use `mutateAsync` inside `handleSubmit` so `isSubmitting` tracks the full async lifecycle
- Map server 409 responses to a field error via `setError("fieldName", { message })`
- Map other server errors to `setError("root", { message })` and render `errors.root?.message`
- Never use manual `useState` for field values or validation — let RHF + Zod handle it

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
- `GET /api/users/me` → `requireAuth` + returns `{ id, name, email, role }` only
- CORS origin driven by `CLIENT_ORIGIN` env var (defaults to `http://localhost:5173`)
- Rate limiting on `/api/auth/sign-in` — **production only** (`NODE_ENV=production`), 10 req / 15 min
- Server exits on startup if `BETTER_AUTH_SECRET` is missing

### Auth middleware (`apps/server/src/middleware/auth.ts`)

- `requireAuth` — reads session via Better Auth, stores in `res.locals.session`, returns 401 if missing
- `requireAdmin` — checks `session.user.role === "admin"`, returns 403 if not; must come after `requireAuth`

Mount routers with `requireAuth` only; apply `requireAdmin` at the individual route level inside the router for admin-only operations:

```ts
// index.ts
app.use("/api/users", requireAuth, usersRouter);

// routes/users.ts
router.get("/me", (req, res) => { ... });           // any authenticated user
router.get("/", requireAdmin, async (req, res) => { ... });  // admin only
router.post("/", requireAdmin, async (req, res) => { ... }); // admin only
```

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

## Prisma Enums

Always use the generated enum object instead of hardcoding strings:

```ts
import { Role } from "../generated/prisma";

role: Role.agent   // not "agent"
role: Role.admin   // not "admin"
```

Import from `../generated/prisma` (same package as `PrismaClient` and `Prisma`).

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

## Component Tests (Vitest + React Testing Library)

Tests live alongside their components: `src/pages/Foo.test.tsx`, `src/components/Bar.test.tsx`.

### Commands

```bash
bun --cwd apps/client run test        # run once (CI)
bun --cwd apps/client run test:watch  # watch mode
```

### Setup files

| File | Purpose |
|---|---|
| `apps/client/vite.config.ts` | Vitest config — jsdom environment, `src/test/setup.ts` |
| `apps/client/src/test/setup.ts` | Imports `@testing-library/jest-dom` matchers |
| `apps/client/src/test/render-utils.tsx` | `renderPage(ui)` — wraps any page in QueryClientProvider + MemoryRouter |

### Patterns

**Always use `renderPage` from `src/test/render-utils.tsx`** — never inline the QueryClient/MemoryRouter boilerplate.

**Mock axios** (never make real HTTP calls in component tests):
```ts
vi.mock("axios");
vi.mocked(axios.get).mockResolvedValue({ data: [...] });  // success
vi.mocked(axios.get).mockRejectedValue(new Error("..."));  // error
vi.mocked(axios.get).mockReturnValue(new Promise(() => {}));  // pending/loading
```

**Mock NavBar** to avoid auth/router dependencies:
```ts
vi.mock("../components/NavBar", () => ({ NavBar: () => <nav data-testid="navbar" /> }));
```

**Reset mocks before each test:**
```ts
beforeEach(() => { vi.resetAllMocks(); });
```

**Use `waitFor` for async state** (after data loads):
```ts
await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
```

### What to test

- Loading/skeleton state
- Successful data render (rows, badges, formatted values)
- Error state message
- That the correct API endpoint is called with the right args

## Testing (Playwright)

### When to write an E2E test vs a unit test

**Unit tests** (Vitest + RTL) cover everything that can be tested without a real browser or server:
- Component rendering (fields, headings, buttons, badges)
- Client-side form validation errors
- Loading / skeleton states
- Error message display
- Data rendering with mocked API responses
- API calls and their arguments (mocked axios)

**E2E tests** (Playwright) cover only what cannot be tested without a real browser + real server:
- Real authentication flows (session creation, cookie storage, redirects)
- Real navigation between pages
- Real mutations that hit the DB: POST / PATCH / DELETE and their effect on the UI
- Role-based routing enforced by the server (e.g. agent redirected from `/users`)
- Server-side validation responses (e.g. 409 conflict surfaced in the UI)

**Never duplicate in E2E what a unit test already covers.** If the same assertion can be made in a Vitest test (rendering, validation errors, skeleton rows, etc.), write it there — not in Playwright.

To write E2E tests, use the **playwright-e2e-writer** agent:

```
@agent-playwright-e2e-writer <describe what to test>
```

The agent has access to `tests/CLAUDE.md` for context on the test setup, accounts, routes, and isolation rules. Always invoke it rather than writing Playwright tests by hand.
