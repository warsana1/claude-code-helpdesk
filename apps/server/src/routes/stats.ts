import { Router } from "express";
import { prisma } from "../db";

export const statsRouter = Router();

type StatsRow = {
  total_tickets: bigint;
  open_tickets: bigint;
  ai_resolved: bigint;
  total_resolved: bigint;
  avg_resolution_seconds: number | null;
  tickets_per_day: Array<{ date: string; count: number }>;
};

statsRouter.get("/", async (_req, res) => {
  const [row] = await prisma.$queryRaw<[StatsRow]>`SELECT * FROM get_ticket_stats()`;

  const totalResolved = Number(row.total_resolved);
  const aiResolved = Number(row.ai_resolved);

  res.json({
    totalTickets: Number(row.total_tickets),
    openTickets: Number(row.open_tickets),
    aiResolvedTickets: aiResolved,
    aiResolvedPercent:
      totalResolved === 0 ? null : (aiResolved / totalResolved) * 100,
    avgResolutionSeconds:
      row.avg_resolution_seconds != null
        ? Number(row.avg_resolution_seconds)
        : null,
    ticketsPerDay: row.tickets_per_day,
  });
});
