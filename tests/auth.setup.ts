import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";
import { PrismaClient } from "../apps/server/src/generated/prisma";

const fixturesDir = path.resolve("tests/fixtures");
fs.mkdirSync(fixturesDir, { recursive: true });

const ADMIN_STATE = path.join(fixturesDir, "admin.json");
const AGENT_STATE = path.join(fixturesDir, "agent.json");

// Restore seeded users that may have been soft-deleted by previous test runs or
// manual UI testing. Better Auth sessions survive a soft-delete (it has no
// knowledge of deletedAt), so sign-in would succeed while every protected API
// call would return 401.
setup("restore seeded users", async () => {
  const prisma = new PrismaClient();
  try {
    await prisma.user.updateMany({
      where: {
        email: { in: ["agent@example.com"] },
        deletedAt: { not: null },
      },
      data: { deletedAt: null },
    });
  } finally {
    await prisma.$disconnect();
  }
});

setup("authenticate as admin", async ({ page }) => {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "password123";
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
  await page.context().storageState({ path: ADMIN_STATE });
});

setup("authenticate as agent", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("agent@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
  await page.context().storageState({ path: AGENT_STATE });
});
