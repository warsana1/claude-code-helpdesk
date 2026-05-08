import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { TicketSource, TicketCategory, Prisma } from "../generated/prisma";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

async function classifyTicket(id: number, subject: string, body: string) {
  const { text } = await generateText({
    model: openai("gpt-5-nano"),
    system:
      "You are a customer support classifier. Classify the ticket into exactly one category based on its subject and body.\n" +
      "Categories:\n" +
      "- general_question: general inquiries, account questions, billing, feature questions\n" +
      "- technical_question: bug reports, technical issues, errors, integration problems\n" +
      "- refund_request: refund requests, cancellations, chargebacks\n\n" +
      "Reply with ONLY the category name, nothing else.",
    prompt: `Subject: ${subject}\n\nBody: ${body}`,
  });

  const category = text.trim().toLowerCase();
  if (!Object.values(TicketCategory).includes(category as TicketCategory)) return;

  await prisma.ticket.update({
    where: { id },
    data: { category: category as TicketCategory },
  });
}

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
    const ticket = await prisma.ticket.create({
      data: {
        subject: subject.trim(),
        body: body.trim(),
        fromEmail: from,
        fromName: fromName.trim(),
        category: category ? TicketCategory[category as keyof typeof TicketCategory] : undefined,
        emailMessageId: messageId ?? null,
        source: TicketSource.email,
      },
    });

    if (!category) {
      classifyTicket(ticket.id, ticket.subject, ticket.body).catch(console.error);
    }

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
