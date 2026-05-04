---
name: Auth spec patterns established in tests/auth.spec.ts
description: Patterns used in the auth spec — setup-first describe for storageState, loginAs helper, sign-out isolation
type: project
---

## Storage state strategy

Because `test.use()` must be declared statically, each role gets its own `test.describe` block:

```ts
test.describe("...", () => {
  test.use({ storageState: ADMIN_STATE });  // playwright/.auth/admin.json
  // tests...
});
```

The first describe block in `auth.spec.ts` is a "setup" block (no pre-loaded state) that logs in as each role and calls `context.storageState({ path })` to write the files. All later describes can safely reference these paths because `fullyParallel: false` guarantees serial execution.

## Unauthenticated context

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

This resets any project-level default — use it in every describe that must be unauthenticated.

## loginAs helper

Defined at module level:

```ts
async function loginAs(page, email, password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}
```

## Sign-out test isolation

Sign-out tests do NOT use the shared state files. They log in inline because signing out invalidates the server-side session, which would break the shared state file for all subsequent tests that rely on it.

## No data-testid attributes were needed

All selectors resolve cleanly via `getByLabel`, `getByRole`, and `getByText` against the existing markup. No source components required modification.
