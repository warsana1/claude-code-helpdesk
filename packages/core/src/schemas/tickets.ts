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
export type TicketCategory =
  (typeof TicketCategory)[keyof typeof TicketCategory];

export const TicketSource = {
  email: "email",
  manual: "manual",
} as const;
export type TicketSource = (typeof TicketSource)[keyof typeof TicketSource];

export const updateTicketSchema = z.object({
  status: z.enum(["open", "resolved", "closed"]).optional(),
  category: z
    .enum(["general_question", "technical_question", "refund_request"])
    .optional(),
  assigneeId: z.string().nullable().optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const TicketSortField = {
  id: "id",
  subject: "subject",
  fromName: "fromName",
  category: "category",
  status: "status",
  createdAt: "createdAt",
} as const;
export type TicketSortField =
  (typeof TicketSortField)[keyof typeof TicketSortField];

export const ticketSortSchema = z.object({
  sortBy: z
    .enum(["id", "subject", "fromName", "category", "status", "createdAt"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  category: z
    .enum(["general_question", "technical_question", "refund_request"])
    .optional(),
  status: z.enum(["open", "resolved", "closed"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type TicketSortParams = z.infer<typeof ticketSortSchema>;

export const SenderType = {
  agent: "agent",
  customer: "customer",
} as const;
export type SenderType = (typeof SenderType)[keyof typeof SenderType];

export const createReplySchema = z.object({
  body: z.string().trim().min(1, "Reply body cannot be empty."),
});
export type CreateReplyInput = z.infer<typeof createReplySchema>;

export type ReplyItem = {
  id: number;
  body: string;
  senderType: SenderType;
  createdAt: string;
  user: { id: string; name: string } | null;
};
