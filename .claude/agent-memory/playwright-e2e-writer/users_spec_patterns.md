---
name: Users spec patterns
description: Key patterns established in tests/users.spec.ts for user management CRUD coverage
type: project
---

## Users page test file: `tests/users.spec.ts`

Relies on `ADMIN_STATE` written by `auth.spec.ts` — file ordering (alpha) ensures auth runs first.

### Seeded display names
- Admin user: `name: "Admin"` (seed.ts hardcodes this)
- Agent user: `name: "Agent"` (seed-agent.ts hardcodes this)

These are used in aria-labels: `"Edit Admin"`, `"Edit Agent"`, `"Delete Agent"` (no Delete Admin because the component omits delete for admin-role rows).

### Unique email strategy
Tests create users via `uniqueEmail(prefix)` = `<prefix>-<Date.now()>@example.com` to avoid 409 conflicts across serially-running tests that share the same DB with no per-test reset.

### `createUser` helper
Shared helper that clicks "Create User", fills Name/Email/Password, waits for the POST 201 response, and asserts the modal closed. Callers assert the row appears after it returns.

Password label quirk: in edit mode the label reads "Password (leave blank to keep unchanged)" — to target the password field in create mode use `.getByLabel("Password", { exact: false }).first()`.

### waitForResponse pattern
All mutating actions (POST create, PATCH edit, DELETE confirm) use:
```ts
const responsePromise = page.waitForResponse(
  (r) => r.url().includes("/api/users") && r.request().method() === "POST" // or PATCH/DELETE
);
await page.getByRole("button", { name: "..." }).click();
const response = await responsePromise;
expect(response.status()).toBe(201); // or 200/204
```
The promise is set up BEFORE the click (race-condition safe).

### Delete confirm button locator
The "Delete" confirm button inside the modal conflicts with the "Delete <name>" row buttons. Use `.last()` to target the modal's confirm button:
```ts
await page.getByRole("button", { name: "Delete" }).last().click();
```

### Admin no-delete assertion
```ts
await expect(page.getByRole("button", { name: "Delete Admin" })).not.toBeVisible();
```
Safe across any number of accumulated test rows because it targets the specific admin name.

### Role badge check for a specific row
```ts
const row = page.locator("tr").filter({ hasText: email });
await expect(row.getByText("agent")).toBeVisible();
```
