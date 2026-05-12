import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();
const newEmail = process.argv[2];

if (!newEmail) {
  console.error("Usage: bun prisma/reset-admin-email.ts <new-email>");
  process.exit(1);
}

const currentEmail = process.env.SEED_ADMIN_EMAIL!;
if (!currentEmail) {
  console.error("SEED_ADMIN_EMAIL must be set in .env");
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { email: currentEmail } });

if (!user) {
  console.error(`No user found with email ${currentEmail}`);
  process.exit(1);
}

await prisma.user.update({
  where: { id: user.id },
  data: { email: newEmail },
});

console.log(`Email updated from ${currentEmail} to ${newEmail}`);
await prisma.$disconnect();
