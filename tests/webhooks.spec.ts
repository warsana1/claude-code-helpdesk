import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SERVER_URL = "http://localhost:3001";
const WEBHOOK_PATH = "/api/webhooks/inbound-email";
const VALID_SECRET = process.env.INBOUND_EMAIL_WEBHOOK_SECRET ?? "dev-webhook-secret-1234";

// Credentials for the "ticket appears in GET /api/tickets" test
const ADMIN = { email: "admin@example.com", password: "password123" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a valid base payload. Pass overrides to replace individual fields,
 * or omit keys to test missing-field validation.
 */
function basePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    from: "customer@example.com",
    fromName: "Jane Smith",
    subject: "Login not working",
    body: "Hi, I cannot log in.",
    category: "technical_question",
    ...overrides,
  };
}

/**
 * Builds a unique messageId that embeds the test name so cross-test
 * contamination is impossible even when tests are re-run without a DB reset.
 */
function messageId(label: string): string {
  return `<${label.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}@mail.example>`;
}

// ===========================================================================
// AUTHENTICATION — secret header validation
// ===========================================================================
test.describe("Webhook — secret header validation", () => {
  test("missing X-Webhook-Secret header returns 401", async ({ request }) => {
    const response = await request.post(`${SERVER_URL}${WEBHOOK_PATH}`, {
      data: basePayload({ messageId: messageId("missing-secret") }),
      // deliberately omit headers
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  test("wrong X-Webhook-Secret value returns 401", async ({ request }) => {
    const response = await request.post(`${SERVER_URL}${WEBHOOK_PATH}`, {
      headers: { "X-Webhook-Secret": "wrongsecret" },
      data: basePayload({ messageId: messageId("wrong-secret") }),
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });
});

// ===========================================================================
// HAPPY PATH — valid payload creates a ticket
// ===========================================================================
test.describe("Webhook — happy path", () => {
  test("valid payload with correct secret returns 201 with ticket fields", async ({
    request,
  }) => {
    const response = await request.post(`${SERVER_URL}${WEBHOOK_PATH}`, {
      headers: { "X-Webhook-Secret": VALID_SECRET },
      data: basePayload({ messageId: messageId("happy-path") }),
    });

    expect(response.status()).toBe(201);

    const ticket = await response.json();
    expect(ticket).toMatchObject({
      id: expect.any(Number),
      subject: "Login not working",
      fromEmail: "customer@example.com",
      fromName: "Jane Smith",
      category: "technical_question",
      status: "open",
      source: "email",
    });
  });

  test("omitting category defaults to general_question", async ({ request }) => {
    // Build payload without category field
    const { category: _omitted, ...payloadWithoutCategory } = basePayload({
      messageId: messageId("default-category"),
    }) as { category: string; [key: string]: unknown };

    const response = await request.post(`${SERVER_URL}${WEBHOOK_PATH}`, {
      headers: { "X-Webhook-Secret": VALID_SECRET },
      data: payloadWithoutCategory,
    });

    expect(response.status()).toBe(201);

    const ticket = await response.json();
    expect(ticket.category).toBe("general_question");
  });
});

// ===========================================================================
// VALIDATION — missing or invalid fields return 400
// ===========================================================================
test.describe("Webhook — request body validation", () => {
  test("missing fromName returns 400 with error message", async ({ request }) => {
    const { fromName: _omitted, ...payloadWithoutFromName } = basePayload({
      messageId: messageId("missing-fromname"),
    }) as { fromName: string; [key: string]: unknown };

    const response = await request.post(`${SERVER_URL}${WEBHOOK_PATH}`, {
      headers: { "X-Webhook-Secret": VALID_SECRET },
      data: payloadWithoutFromName,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  test("missing subject returns 400 with error message", async ({ request }) => {
    const { subject: _omitted, ...payloadWithoutSubject } = basePayload({
      messageId: messageId("missing-subject"),
    }) as { subject: string; [key: string]: unknown };

    const response = await request.post(`${SERVER_URL}${WEBHOOK_PATH}`, {
      headers: { "X-Webhook-Secret": VALID_SECRET },
      data: payloadWithoutSubject,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  test("invalid email in from field returns 400", async ({ request }) => {
    const response = await request.post(`${SERVER_URL}${WEBHOOK_PATH}`, {
      headers: { "X-Webhook-Secret": VALID_SECRET },
      data: basePayload({
        from: "not-an-email",
        messageId: messageId("invalid-email"),
      }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });
});

// ===========================================================================
// DEDUPLICATION — same messageId returns 200 { duplicate: true }
// ===========================================================================
test.describe("Webhook — deduplication", () => {
  test("posting the same messageId twice: first call 201, second call 200 { duplicate: true }", async ({
    request,
  }) => {
    const sharedMessageId = messageId("dedup");
    const payload = basePayload({ messageId: sharedMessageId });

    // First call — creates the ticket
    const first = await request.post(`${SERVER_URL}${WEBHOOK_PATH}`, {
      headers: { "X-Webhook-Secret": VALID_SECRET },
      data: payload,
    });
    expect(first.status()).toBe(201);

    // Second call — same messageId, must be detected as duplicate
    const second = await request.post(`${SERVER_URL}${WEBHOOK_PATH}`, {
      headers: { "X-Webhook-Secret": VALID_SECRET },
      data: payload,
    });
    expect(second.status()).toBe(200);
    const body = await second.json();
    expect(body).toEqual({ duplicate: true });
  });
});

// ===========================================================================
// INTEGRATION — ticket created via webhook appears in GET /api/tickets
// ===========================================================================
test.describe("Webhook — ticket visibility in tickets list", () => {
  test("ticket created via webhook appears in authenticated GET /api/tickets", async ({
    request,
  }) => {
    const uniqueSubject = `Webhook test subject ${Date.now()}`;
    const uniqueMessageId = messageId("visibility-check");

    // Step 1: create the ticket via webhook (no auth needed)
    const createResponse = await request.post(`${SERVER_URL}${WEBHOOK_PATH}`, {
      headers: { "X-Webhook-Secret": VALID_SECRET },
      data: basePayload({
        subject: uniqueSubject,
        messageId: uniqueMessageId,
      }),
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    const ticketId: number = created.id;

    // Step 2: authenticate as admin
    const signInResponse = await request.post(
      `${SERVER_URL}/api/auth/sign-in/email`,
      {
        headers: { Origin: "http://localhost:5173" },
        data: { email: ADMIN.email, password: ADMIN.password },
      }
    );
    expect(signInResponse.ok()).toBeTruthy();

    // Step 3: GET /api/tickets — session cookie is carried automatically by
    // the request context after the sign-in response sets it
    const listResponse = await request.get(`${SERVER_URL}/api/tickets`);
    expect(listResponse.ok()).toBeTruthy();

    const tickets = await listResponse.json();
    expect(Array.isArray(tickets)).toBeTruthy();

    const match = tickets.find((t: { id: number }) => t.id === ticketId);
    expect(match).toBeDefined();
    expect(match).toMatchObject({
      id: ticketId,
      subject: uniqueSubject,
      source: "email",
      status: "open",
    });
  });
});
