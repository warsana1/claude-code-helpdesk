import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { request } from "@playwright/test";
import { PrismaClient } from "../apps/server/src/generated/prisma";

const SERVER_DIR = path.resolve("apps/server");
const AUTH_DIR = path.resolve("playwright/.auth");
const SERVER_URL = "http://localhost:3001";
const CLIENT_ORIGIN = "http://localhost:5173";

async function loginAndSaveState(
  email: string,
  password: string,
  outputPath: string
) {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  const res = await ctx.post("/api/auth/sign-in/email", {
    headers: { Origin: CLIENT_ORIGIN },
    data: { email, password },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status()} ${body}`);
  }
  await ctx.storageState({ path: outputPath });
  await ctx.dispose();
}

export default async function globalSetup() {
  // Apply any pending migrations
  execSync("bunx --bun prisma migrate deploy", {
    cwd: SERVER_DIR,
    stdio: "inherit",
  });

  // Clear all data in dependency order
  const prisma = new PrismaClient();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();

  // Seed test users
  execSync("bun prisma/seed.ts", { cwd: SERVER_DIR, stdio: "inherit" });
  execSync("bun prisma/seed-agent.ts", { cwd: SERVER_DIR, stdio: "inherit" });

  // Persist auth state so tests never need to log in via the browser
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await loginAndSaveState("admin@example.com", "password123", path.join(AUTH_DIR, "admin.json"));
  await loginAndSaveState("agent@example.com", "password123", path.join(AUTH_DIR, "agent.json"));
}
