import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();
const newPassword = process.argv[2];

if (!newPassword) {
  console.error("Usage: bun prisma/reset-admin-password.ts <new-password>");
  process.exit(1);
}

const adminEmail = process.env.SEED_ADMIN_EMAIL!;
if (!adminEmail) {
  console.error("SEED_ADMIN_EMAIL must be set in .env");
  process.exit(1);
}

const account = await prisma.account.findFirst({
  where: { user: { email: adminEmail }, providerId: "credential" },
});

if (!account) {
  console.error(`No credential account found for ${adminEmail}`);
  process.exit(1);
}

const hash = await Bun.password.hash(newPassword, { algorithm: "argon2id" });

await prisma.account.update({
  where: { id: account.id },
  data: { password: hash },
});

console.log(`Password updated for ${adminEmail}`);
await prisma.$disconnect();
