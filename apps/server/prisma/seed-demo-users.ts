import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();
const { hashPassword } = await import("@better-auth/utils/password");

const users = [
  { name: "Sarah Mitchell", email: "sarah.mitchell@example.com" },
  { name: "James Okafor", email: "james.okafor@example.com" },
  { name: "Priya Sharma", email: "priya.sharma@example.com" },
  { name: "Tom Nakamura", email: "tom.nakamura@example.com" },
  { name: "Elena Vasquez", email: "elena.vasquez@example.com" },
  { name: "Marcus Webb", email: "marcus.webb@example.com" },
];

for (const u of users) {
  const existing = await prisma.user.findUnique({ where: { email: u.email } });
  if (existing) {
    console.log(`Already exists: ${u.email}`);
    continue;
  }
  const id = crypto.randomUUID();
  const hash = await hashPassword("password123");
  await prisma.user.create({
    data: {
      id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      accounts: {
        create: {
          id: crypto.randomUUID(),
          accountId: id,
          providerId: "credential",
          password: hash,
        },
      },
    },
  });
  console.log(`Created: ${u.email}`);
}

await prisma.$disconnect();
