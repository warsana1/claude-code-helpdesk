import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const email = "agent@example.com";
const password = "password123";

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log(`Agent user already exists: ${email}`);
  await prisma.$disconnect();
  process.exit(0);
}

const id = crypto.randomUUID();
const { hashPassword } = await import("@better-auth/utils/password");
const hash = await hashPassword(password);

await prisma.user.create({
  data: {
    id,
    name: "Agent",
    email,
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

console.log(`Created agent user: ${email}`);
await prisma.$disconnect();
