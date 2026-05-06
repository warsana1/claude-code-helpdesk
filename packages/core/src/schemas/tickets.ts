import { z } from "zod";

export const TicketStatus = {
  open: "open",
  resolved: "resolved",
  closed: "closed",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketCategory = {
  general_question: "general_question",
  technical_question: "technical_question",
  refund_request: "refund_request",
} as const;
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const TicketSource = {
  email: "email",
  manual: "manual",
} as const;
export type TicketSource = (typeof TicketSource)[keyof typeof TicketSource];

export const updateTicketSchema = z.object({
  status: z.enum(["open", "resolved", "closed"]).optional(),
  assigneeId: z.string().nullable().optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
