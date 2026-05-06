---
name: Webhook API test patterns
description: Patterns for API-level Playwright tests against the inbound-email webhook, including secret handling, env var wiring, and dedup testing
type: project
---

The inbound-email webhook lives at `POST /api/webhooks/inbound-email` on the Express server (port 3001). It does not require browser interaction — tests use the `request` fixture directly against `http://localhost:3001`.

**Secret wiring:**
- `INBOUND_EMAIL_WEBHOOK_SECRET=dev-webhook-secret-1234` must be present in `apps/server/.env.test`
- `playwright.config.ts` forwards it via `webServer.env` so the test server process has it at runtime
- Tests read it from `process.env.INBOUND_EMAIL_WEBHOOK_SECRET` with a fallback to the known dev value

**Key behaviors verified:**
- Missing or wrong `X-Webhook-Secret` header → 401
- Valid payload → 201 with `{ id, subject, fromEmail, fromName, category, status:"open", source:"email" }`
- Omitted `category` defaults to `"general_question"` (Prisma default)
- Missing required field (`fromName`, `subject`) or invalid email → 400
- Same `messageId` sent twice → first 201, second 200 `{ duplicate: true }` (Prisma P2002 unique on `emailMessageId`)
- Ticket created via webhook visible in authenticated `GET /api/tickets`

**Deduplication mechanism:** `emailMessageId` column has a `@unique` constraint; the webhook handler catches `P2002` and returns `200 { duplicate: true }` instead of forwarding to the global error handler.

**Cross-test contamination:** Each test embeds the test label + `Date.now()` in its `messageId`, so re-runs never collide. No DB cleanup needed.

**How to apply:** When writing further webhook or ticket API tests, use `request` fixture pointing at `SERVER_URL = "http://localhost:3001"`, not the Vite dev server at 5173.
