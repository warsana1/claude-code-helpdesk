import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const keep = await prisma.ticket.findMany({
  orderBy: { createdAt: "desc" },
  take: 30,
  select: { id: true },
});

const keepIds = keep.map((t) => t.id);

const { count: repliesDeleted } = await prisma.reply.deleteMany({
  where: { ticketId: { notIn: keepIds } },
});

const { count: ticketsDeleted } = await prisma.ticket.deleteMany({
  where: { id: { notIn: keepIds } },
});

const remaining = await prisma.ticket.count();

console.log(`Deleted ${repliesDeleted} replies and ${ticketsDeleted} tickets. Remaining: ${remaining}`);

await prisma.$disconnect();
