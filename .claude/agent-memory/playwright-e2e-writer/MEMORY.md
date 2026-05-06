# HelpDesk Playwright E2E Writer Memory

- [Test infrastructure](project_test_infra.md) — Config location, global-setup, test commands, seeded credentials, test DB setup
- [Auth UI selectors & routing](auth_ui_selectors.md) — Exact locators for login form, NavBar, route redirect rules verified against source
- [Auth spec patterns](auth_spec_patterns.md) — Setup-first describe for storageState, loginAs helper, sign-out isolation rule, no data-testid needed
- [Users spec patterns](users_spec_patterns.md) — uniqueEmail helper, createUser helper, waitForResponse pattern, delete confirm locator, seeded display names
- [Webhook API patterns](webhook_api_patterns.md) — request fixture vs browser, secret env wiring, dedup via P2002, messageId uniqueness strategy
