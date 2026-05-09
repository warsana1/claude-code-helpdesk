# HelpDesk

AI-powered ticket management system. Support emails are automatically ingested, classified, summarized, and resolved — agents handle what the AI can't.

## Features

- **Inbound email ingestion** — Webhook receives emails and creates tickets automatically
- **AI classification** — Tickets are categorized on arrival (General Question, Technical Question, Refund Request)
- **AI auto-resolve** — Tickets are resolved automatically when covered by the knowledge base
- **AI summarization** — One-click summary of any ticket thread
- **AI reply polish** — Drafts an improved version of an agent's reply
- **Ticket management** — Filter, search, sort, assign, and update ticket status
- **Role-based access** — Admin and Agent roles with separate permissions
- **User management** — Admins create and manage agent accounts
- **Dashboard** — Stats and charts for ticket volume, resolution rate, and average handle time
- **Dark / light theme** — System-aware with manual toggle

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| Routing | React Router v7 |
| Data fetching | TanStack Query, Axios |
| Forms | React Hook Form + Zod |
| Backend | Express 5, TypeScript, Bun runtime |
| Database | PostgreSQL via Prisma ORM |
| Auth | Better Auth (email/password, session-based) |
| AI | AI SDK (OpenAI provider) |
| Job queue | pg-boss (durable background jobs) |
| Observability | Sentry (server + client) |
| Deployment | Docker, Railway |
| Testing | Playwright (E2E), Vitest + React Testing Library (unit) |

## Project Structure

```
HelpDesk/
├── apps/
│   ├── server/          # Express backend (port 3001)
│   │   ├── src/
│   │   │   ├── routes/  # API route handlers
│   │   │   ├── jobs/    # pg-boss queue workers
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       ├── migrations/
│   │       └── seed.ts
│   └── client/          # React frontend (port 5173)
│       └── src/
│           ├── pages/
│           ├── components/
│           └── lib/
└── packages/
    └── core/            # Shared Zod schemas and types
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.x
- PostgreSQL database

### Installation

```bash
git clone https://github.com/your-username/helpdesk.git
cd helpdesk
bun install
```

### Environment Variables

Copy the example and fill in values:

```bash
cp apps/server/.env.example apps/server/.env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Session signing secret — run `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Backend URL (default: `http://localhost:3001`) |
| `CLIENT_ORIGIN` | Frontend URL for CORS (default: `http://localhost:5173`) |
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | Shared secret for the inbound email webhook |
| `SEED_ADMIN_EMAIL` | Email for the initial admin account |
| `SEED_ADMIN_PASSWORD` | Password for the initial admin account |
| `SENTRY_DSN` | Sentry DSN (optional) |

### Database Setup

```bash
# Apply migrations
bunx --bun prisma migrate deploy --schema apps/server/prisma/schema.prisma

# Seed the admin account
bun run apps/server/prisma/seed.ts

# (Optional) seed a demo agent account
bun run apps/server/prisma/seed-agent.ts
```

### Running Locally

```bash
bun dev          # start both server and client
bun dev:server   # backend only  (port 3001)
bun dev:client   # frontend only (port 5173)
```

## Seeded Accounts

| Email | Password | Role |
|---|---|---|
| `SEED_ADMIN_EMAIL` value | `SEED_ADMIN_PASSWORD` value | Admin |
| agent@example.com | password123 | Agent |

Sign-up is disabled at runtime. New agents are created by an admin through the Users page.

## API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/sign-in` | — | Email/password login |
| `GET` | `/api/tickets` | ✓ | List tickets (filterable) |
| `GET` | `/api/tickets/:id` | ✓ | Ticket detail |
| `PATCH` | `/api/tickets/:id` | ✓ | Update ticket |
| `POST` | `/api/tickets/:id/replies` | ✓ | Add agent reply |
| `POST` | `/api/tickets/:id/summarize` | ✓ | AI summary |
| `POST` | `/api/tickets/:id/polish-reply` | ✓ | AI reply polish |
| `GET` | `/api/users` | Admin | List users |
| `POST` | `/api/users` | Admin | Create user |
| `PATCH` | `/api/users/:id` | Admin | Update user |
| `DELETE` | `/api/users/:id` | Admin | Soft-delete user |
| `GET` | `/api/stats` | ✓ | Dashboard metrics |
| `POST` | `/api/webhooks/inbound-email` | Secret | Email ingestion |
| `GET` | `/api/health` | — | Health check |

## Inbound Email Setup

The webhook at `POST /api/webhooks/inbound-email` accepts a parsed email payload from any provider (SendGrid, Mailgun, Postmark, etc.). Set the `X-Webhook-Secret` header to match `INBOUND_EMAIL_WEBHOOK_SECRET`.

On receipt:
1. A ticket is created from the email
2. A classification job runs in the background
3. An auto-resolve job checks the knowledge base and resolves or opens the ticket

Update `apps/server/knowledge-base.md` to control what the AI can auto-resolve.

## Deployment

The repo includes a `Dockerfile` and `railway.toml` for one-click Railway deployment.

```bash
# Build the Docker image locally
docker build -t helpdesk .

# Run
docker run -p 3001:3001 --env-file apps/server/.env helpdesk
```

The container runs `prisma migrate deploy` before starting the server.

## Testing

```bash
# E2E (requires running server + client)
bun test:e2e
bun test:e2e:ui      # Playwright UI mode
bun test:e2e:headed  # with visible browser

# Component tests
bun --cwd apps/client run test
bun --cwd apps/client run test:watch
```

## License

MIT
