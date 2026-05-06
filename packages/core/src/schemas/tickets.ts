import { z } from "zod";

export const updateTicketSchema = z.object({
  status: z.enum(["open", "resolved", "closed"]).optional(),
  assigneeId: z.string().nullable().optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
