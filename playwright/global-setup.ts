import { execSync } from "child_process";
import path from "path";
import { PrismaClient } from "../apps/server/src/generated/prisma";

const SERVER_DIR = path.resolve("apps/server");

export default async function globalSetup() {
  // Apply any pending migrations (also creates _prisma_migrations if absent)
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
}
