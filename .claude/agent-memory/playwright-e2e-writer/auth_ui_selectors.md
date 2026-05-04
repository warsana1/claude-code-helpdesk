---
name: HelpDesk auth UI selectors and routing
description: Exact locators for login form, NavBar, and route redirect behaviour verified against source code
type: project
---

## Login page (`apps/client/src/pages/LoginPage.tsx`)

- Email input: `getByLabel("Email")` — `<label>Email</label>` + registered input
- Password input: `getByLabel("Password")`
- Submit button: `getByRole("button", { name: "Sign in" })`
- Heading: `getByRole("heading", { name: "HelpDesk" })`
- Subtitle: `getByText("Sign in to your account")`
- Server error (root): `getByText("Invalid email or password.")` — always same message (no enumeration)
- Client validation errors:
  - Bad/missing email: `"Enter a valid email"` (from zod schema)
  - Missing password: `"Password is required"` (from zod schema)

## NavBar (`apps/client/src/components/NavBar.tsx`)

- Sign out: `getByRole("button", { name: "Sign out" })`
- Users link (admin only): `getByRole("link", { name: "Users" })`
- Username span: `session?.user.name` rendered as plain text inside nav

## Routes and redirect behaviour (`apps/client/src/App.tsx`)

| Route | Unauthenticated | Admin | Agent |
|---|---|---|---|
| `/login` | renders login | redirect → `/` | redirect → `/` |
| `/` | redirect → `/login` | renders HomePage | renders HomePage |
| `/users` | redirect → `/login` | renders UsersPage | redirect → `/` |

## UsersPage heading

`getByRole("heading", { name: "Users" })` — the page renders `<h1>Users</h1>`
