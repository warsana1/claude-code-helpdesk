import { test, expect, type APIRequestContext } from "@playwright/test";

test.use({ storageState: "tests/fixtures/agent.json" });

async function createTicket(request: APIRequestContext): Promise<number> {
  const secret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET ?? "dev-webhook-secret-1234";
  const res = await request.post("http://localhost:3001/api/webhooks/inbound-email", {
    headers: { "x-webhook-secret": secret },
    data: {
      from: "detail-test@example.com",
      fromName: "Detail Tester",
      subject: "E2E Detail Page Ticket",
      body: "This ticket is used for detail page e2e tests.",
      messageId: `detail-${Date.now()}-${Math.random()}`,
    },
  });
  expect(res.status()).toBe(201);
  const ticket = await res.json();
  return ticket.id as number;
}

// ===========================================================================
// MUTATIONS — real POST/PATCH to the server, cannot be unit tested
// ===========================================================================

test("submitting a reply posts to the API and appends it to the thread", async ({ page, request }) => {
  const ticketId = await createTicket(request);
  await page.goto(`/tickets/${ticketId}`);
  await expect(page.getByText("E2E Detail Page Ticket")).toBeVisible();

  const replyText = `Test reply ${Date.now()}`;
  await page.getByLabel("Reply body").fill(replyText);
  const responsePromise = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/tickets/${ticketId}/replies`) &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send reply" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  await expect(page.getByText(replyText)).toBeVisible();
});

test("changing the status select patches the ticket and the change persists on reload", async ({ page, request }) => {
  const ticketId = await createTicket(request);
  await page.goto(`/tickets/${ticketId}`);
  await expect(page.getByText("E2E Detail Page Ticket")).toBeVisible();

  const responsePromise = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/tickets/${ticketId}`) &&
      r.request().method() === "PATCH",
  );
  await page.getByLabel("Status").selectOption("resolved");
  const response = await responsePromise;
  expect(response.status()).toBe(200);

  await page.reload();
  await expect(page.getByLabel("Status")).toHaveValue("resolved");
});
