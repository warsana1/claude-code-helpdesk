import { Router } from "express";
import multer from "multer";
import Parse from "@sendgrid/inbound-mail-parser";
import { prisma } from "../db";
import { TicketSource, Prisma } from "../generated/prisma";
import { boss, AUTO_RESOLVE_TICKET_QUEUE } from "../jobs/boss";

const router = Router();
const upload = multer();

// Parse "Name <email@example.com>" or bare "email@example.com"
function parseFrom(raw: string): { email: string; name: string } {
  const match = raw.match(/^(?:"?([^"<]*)"?\s*)?<?([^>\s@]+@[^>\s]+)>?\s*$/);
  if (match) {
    const name = match[1]?.trim() || match[2].trim();
    return { email: match[2].trim(), name };
  }
  return { email: raw.trim(), name: raw.trim() };
}

// Extract Message-ID header value from raw headers string
function extractMessageId(headers: string): string | null {
  const match = headers.match(/^Message-ID:\s*(.+)$/im);
  return match ? match[1].trim() : null;
}

router.post("/inbound-email", upload.any(), async (req, res, next) => {
  const secret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
  if (!secret)
    return res.status(503).json({ error: "Inbound email not configured." });
  if (req.query.secret !== secret)
    return res.status(401).json({ error: "Unauthorized." });

  const parser = new Parse(
    { keys: ["from", "subject", "text", "html", "headers"] },
    { body: req.body, files: (req.files as Express.Multer.File[]) ?? [] }
  );

  const { from, subject, text, html, headers } = parser.keyValues() as Record<string, string>;

  if (!from || !subject || (!text && !html))
    return res.status(400).json({ error: "Missing required email fields." });

  const { email, name } = parseFrom(from);
  const body = (text || html).trim();
  const messageId = headers ? extractMessageId(headers) : null;

  try {
    const aiAgent = await prisma.user.findUnique({
      where: { email: "ai@helpdesk.local" },
    });

    const ticket = await prisma.ticket.create({
      data: {
        subject: subject.trim(),
        body,
        fromEmail: email,
        fromName: name,
        emailMessageId: messageId,
        source: TicketSource.email,
        assigneeId: aiAgent?.id ?? null,
      },
    });

    await boss.send(AUTO_RESOLVE_TICKET_QUEUE, {
      ticketId: ticket.id,
      fromName: ticket.fromName,
      subject: ticket.subject,
      body: ticket.body,
      hadCategory: false,
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
