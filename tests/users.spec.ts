import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Storage state — written by the "Setup" block in auth.spec.ts which runs
// first (fullyParallel: false, files processed alphabetically: auth < users).
// ---------------------------------------------------------------------------
const ADMIN_STATE = "playwright/.auth/admin.json";
const AGENT_STATE = "playwright/.auth/agent.json";

// ---------------------------------------------------------------------------
// Credentials (mirrors auth.spec.ts — seeded by playwright/global-setup.ts)
// ---------------------------------------------------------------------------
const ADMIN = { email: "admin@example.com", password: "password123" };
const AGENT = { email: "agent@example.com", password: "password123" };

// ---------------------------------------------------------------------------
// Unique email helper — prevents conflicts between tests that run serially
// against the same DB (no per-test reset).
// ---------------------------------------------------------------------------
function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@example.com`;
}

// ---------------------------------------------------------------------------
// Helper — opens the Create User modal, fills the form, and submits.
// Returns when the modal has closed (table row with the new email visible).
// ---------------------------------------------------------------------------
async function createUser(
  page: Page,
  name: string,
  email: string,
  password: string
) {
  await page.getByRole("button", { name: "Create User" }).click();
  await expect(
    page.getByRole("heading", { name: "Create User" })
  ).toBeVisible();

  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);

  const responsePromise = page.waitForResponse(
    (r) => r.url().includes("/api/users") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Create User" }).last().click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);

  // Modal closes; the new row should appear
  await expect(
    page.getByRole("heading", { name: "Create User" })
  ).not.toBeVisible();
}

// ===========================================================================
// ROLE-BASED ACCESS — agent cannot reach /users
// ===========================================================================
test.describe("Users page — agent access denied", () => {
  test.use({ storageState: AGENT_STATE });

  test("agent visiting /users is redirected to /", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/");
  });
});

// ===========================================================================
// LIST — table renders seeded users
// ===========================================================================
test.describe("Users page — list users", () => {
  test.use({ storageState: ADMIN_STATE });

  test("page heading and Create User button are visible", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create User" })
    ).toBeVisible();
  });

  test("table shows the seeded admin user row", async ({ page }) => {
    await page.goto("/users");
    // Wait for the skeleton loaders to resolve (the admin email cell appears)
    await expect(page.getByText(ADMIN.email)).toBeVisible();
  });

  test("table shows the seeded agent user row", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByText(AGENT.email)).toBeVisible();
  });

  test("table shows role badges for both admin and agent", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByText(ADMIN.email)).toBeVisible();
    // There should be at least one badge with each role label — scoped to the row
    // to avoid matching the NavBar name or other elements containing "admin"/"agent"
    const adminRow = page.locator("tr").filter({ hasText: ADMIN.email });
    await expect(adminRow.getByText("admin", { exact: true })).toBeVisible();
    const agentRow = page.locator("tr").filter({ hasText: AGENT.email });
    await expect(agentRow.getByText("agent", { exact: true })).toBeVisible();
  });

  test("table columns — Name, Email, Role, Joined — are visible", async ({
    page,
  }) => {
    await page.goto("/users");
    for (const col of ["Name", "Email", "Role", "Joined"]) {
      await expect(
        page.getByRole("columnheader", { name: col })
      ).toBeVisible();
    }
  });

  test("admin row does NOT show a delete button (admins cannot be deleted)", async ({
    page,
  }) => {
    await page.goto("/users");
    await expect(page.getByText(ADMIN.email)).toBeVisible();

    // The admin's display name is "Admin" (hardcoded in seed.ts).
    // The component renders aria-label="Delete <name>" only when role !== "admin".
    // So there must be no "Delete Admin" button anywhere on the page.
    await expect(
      page.getByRole("button", { name: "Delete Admin" })
    ).not.toBeVisible();
  });

  test("agent row shows an edit button", async ({ page }) => {
    // seed-agent.ts sets the agent's display name to "Agent".
    await page.goto("/users");
    await expect(page.getByText(AGENT.email)).toBeVisible();
    // The agent row must have an accessible edit button.
    await expect(
      page.getByRole("button", { name: "Edit Agent" })
    ).toBeVisible();
  });
});

// ===========================================================================
// CREATE — success path
// ===========================================================================
test.describe("Users page — create user", () => {
  test.use({ storageState: ADMIN_STATE });

  test("Create User button opens the modal with the correct heading", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();
    await expect(
      page.getByRole("heading", { name: "Create User" })
    ).toBeVisible();
  });

  test("modal can be dismissed with the Cancel button", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();
    await expect(
      page.getByRole("heading", { name: "Create User" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Create User" })
    ).not.toBeVisible();
  });

  test("modal can be dismissed with the Escape key", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();
    await expect(
      page.getByRole("heading", { name: "Create User" })
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "Create User" })
    ).not.toBeVisible();
  });

  test("successfully creates a new user and shows them in the table", async ({
    page,
  }) => {
    const email = uniqueEmail("new-user");
    await page.goto("/users");
    await createUser(page, "Test User", email, "password123");
    // The new row must appear in the table
    await expect(page.getByText(email)).toBeVisible();
  });

  test("newly created user shows the agent role badge", async ({ page }) => {
    const email = uniqueEmail("new-agent");
    await page.goto("/users");
    await createUser(page, "New Agent", email, "password123");

    // Find the row by email, then check the sibling role badge
    const row = page.locator("tr").filter({ hasText: email });
    await expect(row.getByText("agent", { exact: true })).toBeVisible();
  });
});

// ===========================================================================
// CREATE — client-side validation errors
// ===========================================================================
test.describe("Users page — create user validation", () => {
  test.use({ storageState: ADMIN_STATE });

  test("shows validation errors when submitting an empty create form", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();
    await expect(
      page.getByRole("heading", { name: "Create User" })
    ).toBeVisible();

    // Submit without filling anything
    await page.getByRole("button", { name: "Create User" }).last().click();

    await expect(
      page.getByText("Name must be at least 3 characters.")
    ).toBeVisible();
    await expect(
      page.getByText("Enter a valid email address.")
    ).toBeVisible();
    await expect(
      page.getByText("Password must be at least 8 characters.")
    ).toBeVisible();
  });

  test("shows email format error for an invalid email", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Valid Name");
    await page.getByLabel("Email", { exact: true }).fill("not-an-email");
    await page.getByRole("button", { name: "Create User" }).last().click();

    await expect(
      page.getByText("Enter a valid email address.")
    ).toBeVisible();
  });

  test("shows email-already-exists error (409) for a duplicate email", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();

    // Use the seeded agent email — guaranteed to already exist
    await page.getByLabel("Name", { exact: true }).fill("Duplicate Email Test");
    await page.getByLabel("Email", { exact: true }).fill(AGENT.email);
    await page.getByLabel("Password", { exact: true }).fill("password123");

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/users") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create User" }).last().click();
    const response = await responsePromise;
    expect(response.status()).toBe(409);

    // The 409 maps to a field error on the email input
    // The exact message comes from the server's P2002 handler
    await expect(page.getByText("A user with that email already exists.")).toBeVisible();
    // Modal must still be open
    await expect(
      page.getByRole("heading", { name: "Create User" })
    ).toBeVisible();
  });
});

// ===========================================================================
// EDIT — success path
// ===========================================================================
test.describe("Users page — edit user", () => {
  test.use({ storageState: ADMIN_STATE });

  // We create a fresh user for edit tests so we don't corrupt the seeded agent
  test("edit button opens the Edit User modal with pre-filled values", async ({
    page,
  }) => {
    const email = uniqueEmail("edit-test");
    const name = "Edit Test User";

    await page.goto("/users");
    await createUser(page, name, email, "password123");

    // Click the edit button for the newly created user
    await page.getByRole("button", { name: `Edit ${name}` }).click();

    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).toBeVisible();
    // Name field should be pre-filled
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue(name);
    // Email field should be pre-filled
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
  });

  test("can update the user's name and see the change in the table", async ({
    page,
  }) => {
    const email = uniqueEmail("edit-name");
    const originalName = "Original Name";
    const updatedName = "Updated Name";

    await page.goto("/users");
    await createUser(page, originalName, email, "password123");

    await page.getByRole("button", { name: `Edit ${originalName}` }).click();
    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).toBeVisible();

    // Clear and update the name
    await page.getByLabel("Name", { exact: true }).clear();
    await page.getByLabel("Name", { exact: true }).fill(updatedName);

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/users") && r.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: "Save Changes" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Modal closes; updated name appears in the table
    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).not.toBeVisible();
    await expect(page.getByText(updatedName)).toBeVisible();
  });

  test("can update the user's email and see the change in the table", async ({
    page,
  }) => {
    const originalEmail = uniqueEmail("edit-email-orig");
    const updatedEmail = uniqueEmail("edit-email-new");

    await page.goto("/users");
    await createUser(page, "Email Edit User", originalEmail, "password123");

    await page.getByRole("button", { name: "Edit Email Edit User" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).toBeVisible();

    await page.getByLabel("Email", { exact: true }).clear();
    await page.getByLabel("Email", { exact: true }).fill(updatedEmail);

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/users") && r.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: "Save Changes" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).not.toBeVisible();
    await expect(page.getByText(updatedEmail)).toBeVisible();
  });

  test("edit modal can be dismissed with Cancel", async ({ page }) => {
    const email = uniqueEmail("edit-cancel");

    await page.goto("/users");
    await createUser(page, "Cancel Edit User", email, "password123");

    await page.getByRole("button", { name: "Edit Cancel Edit User" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).not.toBeVisible();
    // Original row unchanged
    await expect(page.getByText(email)).toBeVisible();
  });

  test("edit modal shows validation error for a name shorter than 3 characters", async ({
    page,
  }) => {
    const email = uniqueEmail("edit-validation");

    await page.goto("/users");
    await createUser(page, "Validation User", email, "password123");

    await page.getByRole("button", { name: "Edit Validation User" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).toBeVisible();

    await page.getByLabel("Name", { exact: true }).clear();
    await page.getByLabel("Name", { exact: true }).fill("AB");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(
      page.getByText("Name must be at least 3 characters.")
    ).toBeVisible();
    // Modal must remain open
    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).toBeVisible();
  });
});

// ===========================================================================
// DELETE — success path and confirmation flow
// ===========================================================================
test.describe("Users page — delete user", () => {
  test.use({ storageState: ADMIN_STATE });

  test("delete button opens the Delete User confirmation modal", async ({
    page,
  }) => {
    const email = uniqueEmail("delete-modal");
    const name = "Delete Modal User";

    await page.goto("/users");
    await createUser(page, name, email, "password123");

    await page.getByRole("button", { name: `Delete ${name}` }).click();

    await expect(
      page.getByRole("heading", { name: "Delete User" })
    ).toBeVisible();
    // The modal shows the user's name for confirmation — scope to the <p> to
    // avoid matching the table cell which also contains the name
    await expect(page.locator("p").filter({ hasText: name })).toBeVisible();
    await expect(
      page.getByText("This action cannot be undone.")
    ).toBeVisible();
  });

  test("Cancel button closes the delete modal without deleting the user", async ({
    page,
  }) => {
    const email = uniqueEmail("delete-cancel");
    const name = "Delete Cancel User";

    await page.goto("/users");
    await createUser(page, name, email, "password123");

    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(
      page.getByRole("heading", { name: "Delete User" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Delete User" })
    ).not.toBeVisible();
    // User must still be in the table
    await expect(page.getByText(email)).toBeVisible();
  });

  test("Escape key closes the delete modal without deleting the user", async ({
    page,
  }) => {
    const email = uniqueEmail("delete-escape");
    const name = "Delete Escape User";

    await page.goto("/users");
    await createUser(page, name, email, "password123");

    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(
      page.getByRole("heading", { name: "Delete User" })
    ).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("heading", { name: "Delete User" })
    ).not.toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  test("confirming deletion removes the user from the table", async ({
    page,
  }) => {
    const email = uniqueEmail("delete-confirm");
    const name = "Delete Confirm User";

    await page.goto("/users");
    await createUser(page, name, email, "password123");
    await expect(page.getByText(email)).toBeVisible();

    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(
      page.getByRole("heading", { name: "Delete User" })
    ).toBeVisible();

    const responsePromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/users") &&
        r.request().method() === "DELETE"
    );
    // The confirm button inside the delete modal is labeled "Delete"
    await page.getByRole("button", { name: "Delete" }).last().click();
    const response = await responsePromise;
    expect(response.status()).toBe(204);

    // Modal closes
    await expect(
      page.getByRole("heading", { name: "Delete User" })
    ).not.toBeVisible();
    // Row must no longer appear
    await expect(page.getByText(email)).not.toBeVisible();
  });

  test("admin user row does not have a delete button", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByText(ADMIN.email)).toBeVisible();

    // The admin's display name is "Admin" (hardcoded in seed.ts).
    // The component omits the delete button entirely for admin-role rows.
    await expect(
      page.getByRole("button", { name: "Delete Admin" })
    ).not.toBeVisible();
  });
});
