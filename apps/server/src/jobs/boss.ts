import { PgBoss } from "pg-boss";
import { generateText, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { prisma } from "../db";
import { TicketCategory, TicketStatus, SenderType } from "../generated/prisma";

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";
export const AUTO_RESOLVE_TICKET_QUEUE = "auto-resolve-ticket";

export type ClassifyTicketData = {
  ticketId: number;
  subject: string;
  body: string;
};

export type AutoResolveTicketData = {
  ticketId: number;
  fromName: string;
  subject: string;
  body: string;
  hadCategory: boolean;
};

const knowledgeBase = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../knowledge-base.md"),
  "utf-8"
);

export const boss = new PgBoss(process.env.DATABASE_URL!);
boss.on("error", console.error);

export async function startBoss() {
  await boss.start();
  await boss.createQueue(CLASSIFY_TICKET_QUEUE);
  await boss.createQueue(AUTO_RESOLVE_TICKET_QUEUE);

  await boss.work<ClassifyTicketData>(CLASSIFY_TICKET_QUEUE, async ([job]) => {
    const { ticketId, subject, body } = job.data;

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
      where: { id: ticketId },
      data: { category: category as TicketCategory },
    });
  });

  await boss.work<AutoResolveTicketData>(AUTO_RESOLVE_TICKET_QUEUE, async ([job]) => {
    const { ticketId, fromName, subject, body, hadCategory } = job.data;

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.processing },
    });

    let object: { canResolve: boolean; response: string | null };
    try {
      ({ object } = await generateObject({
        model: openai("gpt-5-nano"),
        schema: z.object({
          canResolve: z.boolean(),
          response: z.string().nullable(),
        }),
        system:
          "You are a warm, professional customer support agent for Code with Mosh online courses.\n" +
          "Use the knowledge base below to determine if the ticket can be fully resolved.\n\n" +
          "You MUST NOT resolve if any of these escalation conditions apply:\n" +
          "- The user threatens legal action\n" +
          "- The user requests a refund outside the 30-day window\n" +
          "- The user disputes a charge or mentions a chargeback\n" +
          "- The issue involves account security concerns\n\n" +
          "If the question is fully answerable from the knowledge base and no escalation triggers apply, set canResolve to true and write a reply following these guidelines:\n" +
          "- Open with 'Hi [first name],' on its own line\n" +
          "- Acknowledge the customer's concern briefly and empathetically before answering\n" +
          "- Use short paragraphs; use a numbered list only for sequential steps, a bullet list for non-sequential items\n" +
          "- Be concise — answer the question fully but avoid unnecessary padding\n" +
          "- Close with an offer to help further, then 'Best regards,\\nCode with Mosh Support'\n" +
          "- Do not invent information not in the knowledge base\n\n" +
          "Otherwise set canResolve to false and response to null.\n\n" +
          "Knowledge Base:\n" +
          knowledgeBase,
        prompt: `Customer name: ${fromName}\nSubject: ${subject}\nMessage: ${body}`,
      }));
    } catch (err) {
      console.error(`Auto-resolve failed for ticket ${ticketId}:`, err);
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.open },
      });
      if (!hadCategory) {
        await boss.send(CLASSIFY_TICKET_QUEUE, { ticketId, subject, body });
      }
      return;
    }

    if (object.canResolve && object.response) {
      await prisma.$transaction([
        prisma.reply.create({
          data: {
            ticketId,
            body: object.response,
            senderType: SenderType.agent,
            userId: null,
          },
        }),
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: TicketStatus.resolved },
        }),
      ]);
    } else {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.open },
      });
      if (!hadCategory) {
        await boss.send(CLASSIFY_TICKET_QUEUE, { ticketId, subject, body });
      }
    }
  });
}
