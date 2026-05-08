import { test, expect, type Page } from "@playwright/test";

const ADMIN_STATE = "tests/fixtures/admin.json";
const AGENT_STATE = "tests/fixtures/agent.json";

const ADMIN = { email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com", password: process.env.SEED_ADMIN_PASSWORD ?? "password123" };
const AGENT = { email: "agent@example.com", password: "password123" };

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

// ===========================================================================
// AUTHENTICATION OUTCOMES — real API calls, cannot be unit tested
// ===========================================================================
test.describe("Login — authentication outcomes", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("valid admin credentials redirect to /", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/");
  });

  test("valid agent credentials redirect to /", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(AGENT.email);
    await page.getByLabel("Password").fill(AGENT.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/");
  });

  test("wrong password shows error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("non-existent email shows same error (no email enumeration)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });
});

// ===========================================================================
// REDIRECT BEHAVIOUR — real session check
// ===========================================================================
test.describe("Login — redirect for authenticated admin", () => {
  test.use({ storageState: ADMIN_STATE });

  test("admin visiting /login is redirected to /", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });
});

test.describe("Login — redirect for authenticated agent", () => {
  test.use({ storageState: AGENT_STATE });

  test("agent visiting /login is redirected to /", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });
});

// ===========================================================================
// PROTECTED ROUTES — unauthenticated access
// ===========================================================================
test.describe("Protected routes — unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("visiting / redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("visiting /users redirects to /login", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/login");
  });
});

// ===========================================================================
// SESSION PERSISTENCE — real session cookie behaviour
// ===========================================================================
test.describe("Session persistence", () => {
  test.use({ storageState: ADMIN_STATE });

  test("session survives a full page reload", async ({ page }) => {
    await page.goto("/");
    await page.reload();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(page).toHaveURL("/");
  });
});

// ===========================================================================
// SIGN OUT — real session invalidation
// ===========================================================================
test.describe("Sign out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("sign-out ends the session and redirects to /login", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("after sign out, / redirects back to /login", async ({ page }) => {
    await loginAs(page, AGENT.email, AGENT.password);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });
});

// ===========================================================================
// ROLE-BASED ACCESS — real auth + real redirect
// ===========================================================================
test.describe("Role-based access — admin", () => {
  test.use({ storageState: ADMIN_STATE });

  test("admin can navigate to /users via the NavBar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL("/users");
  });

  test("admin NavBar shows the Users link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });
});

test.describe("Role-based access — agent", () => {
  test.use({ storageState: AGENT_STATE });

  test("agent visiting /users is redirected to /", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/");
  });

  test("agent NavBar does not show the Users link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
  });
});
