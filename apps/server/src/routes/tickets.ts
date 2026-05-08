import { Router } from "express";
import { updateTicketSchema, ticketSortSchema, createReplySchema } from "@helpdesk/core";
import { SenderType } from "../generated/prisma";
import { prisma } from "../db";

const router = Router();

function firstIssue(result: { error: { issues: Array<{ message: string }> } }) {
  return result.error.issues[0].message;
}

router.get("/", async (req, res) => {
  const result = ticketSortSchema.safeParse(req.query);
  if (!result.success)
    return res.status(400).json({ error: firstIssue(result) });

  const {
    sortBy = "createdAt",
    sortOrder = "desc",
    category,
    status,
    search,
    page = 1,
    pageSize = 10,
  } = result.data;

  const where = {
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { subject:   { contains: search, mode: "insensitive" as const } },
        { fromName:  { contains: search, mode: "insensitive" as const } },
        { fromEmail: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      select: {
        id: true,
        subject: true,
        fromEmail: true,
        fromName: true,
        category: true,
        status: true,
        source: true,
        createdAt: true,
        assignee: { select: { id: true, name: true } },
      },
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ data: tickets, total });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { assignee: { select: { id: true, name: true } } },
  });
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });
  res.json(ticket);
});

router.patch("/:id", async (req, res, next) => {
  const result = updateTicketSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: firstIssue(result) });

  const id = Number(req.params.id);
  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: result.data,
      include: { assignee: { select: { id: true, name: true } } },
    });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/replies", async (req, res) => {
  const ticketId = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });

  const replies = await prisma.reply.findMany({
    where: { ticketId },
    select: {
      id: true,
      body: true,
      senderType: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json(replies);
});

router.post("/:id/replies", async (req, res, next) => {
  const result = createReplySchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: firstIssue(result) });

  const ticketId = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });

  const userId = res.locals.session.user.id;

  try {
    const reply = await prisma.reply.create({
      data: {
        ticketId,
        body: result.data.body,
        senderType: SenderType.agent,
        userId,
      },
      select: {
        id: true,
        body: true,
        senderType: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(reply);
  } catch (err) {
    next(err);
  }
});

export { router as ticketsRouter };
