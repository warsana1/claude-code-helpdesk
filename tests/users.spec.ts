import { test, expect, type Page } from "@playwright/test";

const ADMIN_STATE = "tests/fixtures/admin.json";
const AGENT_STATE = "tests/fixtures/agent.json";

const AGENT = { email: "agent@example.com" };

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@example.com`;
}

async function createUser(page: Page, name: string, email: string, password: string) {
  await page.getByRole("button", { name: "Create User" }).click();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes("/api/users") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Create User" }).last().click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Create User" })).not.toBeVisible();
}

// ===========================================================================
// REAL DATA — seeded users visible via real API call
// ===========================================================================
test.describe("Users page — real data", () => {
  test.use({ storageState: ADMIN_STATE });

  test("seeded admin and agent appear in the table", async ({ page }) => {
    await page.goto("/users");
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
    await expect(page.getByText(adminEmail)).toBeVisible();
  });
});

// ===========================================================================
// CREATE — real POST to /api/users
// ===========================================================================
test.describe("Users page — create user", () => {
  test.use({ storageState: ADMIN_STATE });

  test("successfully creates a new user and shows them in the table", async ({ page }) => {
    const email = uniqueEmail("new-user");
    await page.goto("/users");
    await createUser(page, "Test User", email, "password123");
    await expect(page.getByText(email)).toBeVisible();
  });

  test("shows 409 error when email already exists", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Duplicate");
    await page.getByLabel("Email", { exact: true }).fill(AGENT.email);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/users") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create User" }).last().click();
    const response = await responsePromise;
    expect(response.status()).toBe(409);
    await expect(page.getByText("A record with that value already exists.")).toBeVisible();
  });
});

// ===========================================================================
// EDIT — real PATCH to /api/users/:id
// ===========================================================================
test.describe("Users page — edit user", () => {
  test.use({ storageState: ADMIN_STATE });

  test("can update a user's name and see the change in the table", async ({ page }) => {
    const email = uniqueEmail("edit-name");
    const updatedName = "Updated Name";
    await page.goto("/users");
    await createUser(page, "Original Name", email, "password123");
    await page.getByRole("button", { name: "Edit Original Name" }).click();
    await page.getByLabel("Name", { exact: true }).clear();
    await page.getByLabel("Name", { exact: true }).fill(updatedName);
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/users") && r.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: "Save Changes" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Edit User" })).not.toBeVisible();
    await expect(page.locator("tr").filter({ hasText: email }).getByText(updatedName)).toBeVisible();
  });
});

// ===========================================================================
// DELETE — real DELETE to /api/users/:id
// ===========================================================================
test.describe("Users page — delete user", () => {
  test.use({ storageState: ADMIN_STATE });

  test("confirming deletion removes the user from the table", async ({ page }) => {
    const email = uniqueEmail("delete-confirm");
    const name = "Delete Confirm User";
    await page.goto("/users");
    await createUser(page, name, email, "password123");
    await expect(page.getByText(email)).toBeVisible();
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(page.getByRole("heading", { name: "Delete User" })).toBeVisible();
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/users") && r.request().method() === "DELETE"
    );
    await page.getByRole("button", { name: "Delete" }).last().click();
    const response = await responsePromise;
    expect(response.status()).toBe(204);
    await expect(page.getByRole("heading", { name: "Delete User" })).not.toBeVisible();
    await expect(page.getByText(email)).not.toBeVisible();
  });
});
