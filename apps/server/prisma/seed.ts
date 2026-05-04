import "dotenv/config";
import { PrismaClient, Role } from "../src/generated/prisma";

const prisma = new PrismaClient();

const email = process.env.SEED_ADMIN_EMAIL!;
const password = process.env.SEED_ADMIN_PASSWORD!;

if (!email || !password) {
  console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
  process.exit(1);
}

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log(`Admin user already exists: ${email}`);
  await prisma.$disconnect();
  process.exit(0);
}

const id = crypto.randomUUID();
const { hashPassword } = await import("@better-auth/utils/password");
const hash = await hashPassword(password);

await prisma.user.create({
  data: {
    id,
    name: "Admin",
    email,
    emailVerified: true,
    role: Role.admin,
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

console.log(`Created admin user: ${email}`);
await prisma.$disconnect();
