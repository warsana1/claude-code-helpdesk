import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient, Role } from "../src/generated/prisma";

const prisma = new PrismaClient();

const email = process.env.SEED_ADMIN_EMAIL!;
const password = process.env.SEED_ADMIN_PASSWORD!;

if (!email || !password) {
  console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
  process.exit(1);
}

// Separate auth instance with sign-up enabled for seeding
const seedAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
});

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log(`Admin user already exists: ${email}`);
  await prisma.$disconnect();
  process.exit(0);
}

const { user } = await seedAuth.api.signUpEmail({
  body: { email, password, name: "Admin" },
});

await prisma.user.update({
  where: { id: user.id },
  data: { role: Role.admin },
});

console.log(`Created admin user: ${user.email}`);
await prisma.$disconnect();
