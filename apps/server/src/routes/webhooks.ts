import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { TicketSource, TicketCategory, Prisma } from "../generated/prisma";
import { boss, AUTO_RESOLVE_TICKET_QUEUE } from "../jobs/boss";

const router = Router();

const inboundEmailSchema = z.object({
  from: z.string().email("Invalid sender email."),
  fromName: z.string().min(1, "Sender name is required."),
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Body is required."),
  category: z.enum(["general_question", "technical_question", "refund_request"]).optional(),
  messageId: z.string().optional(),
});

router.post("/inbound-email", async (req, res, next) => {
  const secret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
  if (!secret)
    return res.status(503).json({ error: "Inbound email not configured." });
  if (req.headers["x-webhook-secret"] !== secret)
    return res.status(401).json({ error: "Unauthorized." });

  const result = inboundEmailSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: result.error.issues[0].message });

  const { from, fromName, subject, body, category, messageId } = result.data;

  try {
    const aiAgent = await prisma.user.findUnique({ where: { email: "ai@helpdesk.local" } });

    const ticket = await prisma.ticket.create({
      data: {
        subject: subject.trim(),
        body: body.trim(),
        fromEmail: from,
        fromName: fromName.trim(),
        category: category ? TicketCategory[category as keyof typeof TicketCategory] : undefined,
        emailMessageId: messageId ?? null,
        source: TicketSource.email,
        assigneeId: aiAgent?.id ?? null,
      },
    });

    await boss.send(AUTO_RESOLVE_TICKET_QUEUE, {
      ticketId: ticket.id,
      fromName: ticket.fromName,
      subject: ticket.subject,
      body: ticket.body,
      hadCategory: !!category,
    });

    res.status(201).json(ticket);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(200).json({ duplicate: true });
    }
    next(err);
  }
});

export { router as webhooksRouter };
