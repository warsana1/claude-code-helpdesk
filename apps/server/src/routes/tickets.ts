import { Router } from "express";
import {
  updateTicketSchema,
  ticketSortSchema,
  createReplySchema,
} from "@helpdesk/core";
import { SenderType, TicketStatus } from "../generated/prisma";
import { prisma } from "../db";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

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
    ...(status
      ? { status }
      : { status: { notIn: [TicketStatus["new"], TicketStatus.processing] } }),
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { subject: { contains: search, mode: "insensitive" as const } },
            { fromName: { contains: search, mode: "insensitive" as const } },
            { fromEmail: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
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
      bodyHtml: true,
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
        bodyHtml: result.data.bodyHtml,
        senderType: SenderType.agent,
        userId,
      },
      select: {
        id: true,
        body: true,
        bodyHtml: true,
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

router.post("/:id/summarize", async (req, res, next) => {
  const ticketId = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });

  const replies = await prisma.reply.findMany({
    where: { ticketId },
    select: {
      body: true,
      senderType: true,
      user: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const lines = [
    `Customer: ${ticket.fromName} <${ticket.fromEmail}>`,
    `Subject: ${ticket.subject}`,
    `Status: ${ticket.status}`,
    `Category: ${ticket.category}`,
    `\nOriginal Message:\n${ticket.body || "(no body)"}`,
  ];

  if (replies.length > 0) {
    lines.push("\nConversation History:");
    for (const reply of replies) {
      const sender =
        reply.senderType === "agent" ? (reply.user?.name ?? "Agent") : ticket.fromName;
      lines.push(`[${reply.senderType.toUpperCase()}] ${sender}: ${reply.body}`);
    }
  }

  try {
    const { text } = await generateText({
      model: openai("gpt-5-nano"),
      system:
        "You are a customer support analyst. Summarize the support ticket and conversation concisely. Include: the customer's issue, key exchanges, current status, and any resolution or next steps.",
      prompt: lines.join("\n"),
    });

    res.json({ summary: text });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/polish-reply", async (req, res, next) => {
  const result = createReplySchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: firstIssue(result) });

  const ticketId = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });

  const agentName = res.locals.session.user.name as string;

  try {
    const { text } = await generateText({
      model: openai("gpt-5-nano"),
      system:
        `You are a customer support specialist. Polish the agent's draft reply to be professional, clear, and empathetic. Preserve the original meaning. Begin the reply by addressing the customer by their first name: ${ticket.fromName}. Return only the improved reply text with no extra commentary. Do not include any sign-off or signature.`,
      prompt: result.data.body,
    });

    res.json({ polishedBody: `${text}\n\nBest regards,\n${agentName}` });
  } catch (err) {
    next(err);
  }
});

export { router as ticketsRouter };
