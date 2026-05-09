import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();
const email = "ai@helpdesk.local";

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log(`AI agent already exists: ${email} (id: ${existing.id})`);
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.user.create({
  data: {
    id: crypto.randomUUID(),
    name: "AI",
    email,
    emailVerified: false,
  },
});

console.log(`Created AI agent: ${email}`);
await prisma.$disconnect();
