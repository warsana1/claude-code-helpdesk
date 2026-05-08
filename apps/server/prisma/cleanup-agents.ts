import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const keepEmails = [
  "sarah.mitchell@example.com",
  "james.okafor@example.com",
  "priya.sharma@example.com",
  "tom.nakamura@example.com",
  "elena.vasquez@example.com",
  "marcus.webb@example.com",
];

const toDelete = await prisma.user.findMany({
  where: {
    deletedAt: null,
    role: "agent",
    email: { notIn: keepEmails },
  },
  select: { id: true, email: true },
});

if (toDelete.length === 0) {
  console.log("Nothing to delete — already at 6 agents.");
} else {
  for (const u of toDelete) {
    await prisma.session.deleteMany({ where: { userId: u.id } });
    await prisma.user.update({ where: { id: u.id }, data: { deletedAt: new Date() } });
    console.log(`Soft-deleted: ${u.email}`);
  }
}

await prisma.$disconnect();
