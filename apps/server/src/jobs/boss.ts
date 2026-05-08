import { PgBoss } from "pg-boss";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { prisma } from "../db";
import { TicketCategory } from "../generated/prisma";

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";

export type ClassifyTicketData = {
  ticketId: number;
  subject: string;
  body: string;
};

export const boss = new PgBoss(process.env.DATABASE_URL!);
boss.on("error", console.error);

export async function startBoss() {
  await boss.start();
  await boss.createQueue(CLASSIFY_TICKET_QUEUE);

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
}
