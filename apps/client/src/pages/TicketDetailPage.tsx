import { useState } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, Sparkles } from "lucide-react";
import { TicketStatus, TicketCategory, TicketSource, SenderType, type ReplyItem } from "@helpdesk/core";
import { NavBar } from "../components/NavBar";

type TicketDetail = {
  id: number;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  category: TicketCategory;
  status: TicketStatus;
  source: TicketSource;
  emailMessageId: string | null;
  assigneeId: string | null;
  assignee: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

type Agent = { id: string; name: string };

async function fetchTicket(id: number): Promise<TicketDetail> {
  const { data } = await axios.get<TicketDetail>(`/api/tickets/${id}`, {
    withCredentials: true,
  });
  return data;
}

async function fetchAgents(): Promise<Agent[]> {
  const { data } = await axios.get<Agent[]>("/api/users/agents", {
    withCredentials: true,
  });
  return data;
}

async function fetchReplies(ticketId: number): Promise<ReplyItem[]> {
  const { data } = await axios.get<ReplyItem[]>(`/api/tickets/${ticketId}/replies`, {
    withCredentials: true,
  });
  return data;
}

async function polishReply(ticketId: number, body: string): Promise<string> {
  const { data } = await axios.post<{ polishedBody: string }>(
    `/api/tickets/${ticketId}/polish-reply`,
    { body },
    { withCredentials: true },
  );
  return data.polishedBody;
}

async function postReply(ticketId: number, body: string): Promise<ReplyItem> {
  const { data } = await axios.post<ReplyItem>(
    `/api/tickets/${ticketId}/replies`,
    { body },
    { withCredentials: true },
  );
  return data;
}

async function patchTicket(
  ticketId: number,
  patch: { status?: TicketStatus; category?: TicketCategory; assigneeId?: string | null },
): Promise<TicketDetail> {
  const { data } = await axios.patch<TicketDetail>(
    `/api/tickets/${ticketId}`,
    patch,
    { withCredentials: true },
  );
  return data;
}

const selectClass =
  "w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60";

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);
  const queryClient = useQueryClient();

  const { data: ticket, isPending, isError } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
    enabled: !isNaN(ticketId),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });

  const { mutate: updateStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: (status: TicketStatus) => patchTicket(ticketId, { status }),
    onSuccess: (updated) => queryClient.setQueryData(["ticket", ticketId], updated),
  });

  const { mutate: updateCategory, isPending: isUpdatingCategory } = useMutation({
    mutationFn: (category: TicketCategory) => patchTicket(ticketId, { category }),
    onSuccess: (updated) => queryClient.setQueryData(["ticket", ticketId], updated),
  });

  const { mutate: assignAgent, isPending: isAssigning } = useMutation({
    mutationFn: (assigneeId: string | null) => patchTicket(ticketId, { assigneeId }),
    onSuccess: (updated) => queryClient.setQueryData(["ticket", ticketId], updated),
  });

  const [replyBody, setReplyBody] = useState("");
  const [polishError, setPolishError] = useState<string | null>(null);

  const { data: replies = [] } = useQuery({
    queryKey: ["replies", ticketId],
    queryFn: () => fetchReplies(ticketId),
    enabled: !isNaN(ticketId),
  });

  const { mutate: submitReply, isPending: isSubmittingReply } = useMutation({
    mutationFn: (body: string) => postReply(ticketId, body),
    onSuccess: (newReply) => {
      queryClient.setQueryData<ReplyItem[]>(["replies", ticketId], (prev = []) => [
        ...prev,
        newReply,
      ]);
      setReplyBody("");
    },
  });

  const { mutate: runPolish, isPending: isPolishing } = useMutation({
    mutationFn: (body: string) => polishReply(ticketId, body),
    onSuccess: (polished) => {
      setReplyBody(polished);
      setPolishError(null);
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? err.message
        : "Failed to polish reply.";
      setPolishError(msg);
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={15} />
          Back to tickets
        </Link>

        {isPending && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="h-7 w-2/3 bg-gray-200 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-500">Failed to load ticket.</p>
        )}

        {ticket && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  {ticket.subject}
                </h1>
                <span className="text-gray-400 font-mono text-sm shrink-0">
                  #{ticket.id}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_260px] divide-x divide-gray-100">
              {/* Left column: info + message */}
              <div className="p-6 space-y-6 text-sm">
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">From</p>
                    <p className="font-medium text-gray-800">{ticket.fromName}</p>
                    <p className="text-gray-500">{ticket.fromEmail}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Created</p>
                      <p className="text-gray-700">{new Date(ticket.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Last updated</p>
                      <p className="text-gray-700">{new Date(ticket.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Message</p>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {ticket.body || <span className="text-gray-400 italic">No message body.</span>}
                  </div>
                </div>

                {replies.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">
                      Replies ({replies.length})
                    </p>
                    <div className="space-y-3">
                      {replies.map((reply) => (
                        <div
                          key={reply.id}
                          className={`rounded-lg p-3 text-sm ${
                            reply.senderType === SenderType.agent
                              ? "bg-blue-50 border border-blue-100"
                              : "bg-gray-50 border border-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-medium text-gray-800">
                              {reply.senderType === SenderType.agent
                                ? (reply.user?.name ?? "Agent")
                                : ticket.fromName}
                            </span>
                            <span
                              className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                reply.senderType === SenderType.agent
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {reply.senderType}
                            </span>
                            <span className="ml-auto text-gray-400 text-xs">
                              {new Date(reply.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {reply.bodyHtml ? (
                            <div
                              className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: reply.bodyHtml }}
                            />
                          ) : (
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {reply.body}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Reply</p>
                  <textarea
                    aria-label="Reply body"
                    value={replyBody}
                    onChange={(e) => { setReplyBody(e.target.value); setPolishError(null); }}
                    placeholder="Write a reply…"
                    rows={4}
                    disabled={isSubmittingReply}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none disabled:opacity-60"
                  />
                  {polishError && (
                    <p className="text-xs text-red-500 mt-1">{polishError}</p>
                  )}
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => {
                        const trimmed = replyBody.trim();
                        if (trimmed) runPolish(trimmed);
                      }}
                      disabled={isPolishing || isSubmittingReply || replyBody.trim().length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Sparkles size={14} />
                      {isPolishing ? "Polishing…" : "Polish"}
                    </button>
                    <button
                      onClick={() => {
                        const trimmed = replyBody.trim();
                        if (trimmed) submitReply(trimmed);
                      }}
                      disabled={isSubmittingReply || isPolishing || replyBody.trim().length === 0}
                      className="px-4 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmittingReply ? "Sending…" : "Send reply"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right column: dropdowns */}
              <div className="p-6 space-y-4 text-sm">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Assigned to</p>
                  <select
                    aria-label="Assign to agent"
                    value={ticket.assignee?.id ?? ""}
                    disabled={isAssigning}
                    onChange={(e) => assignAgent(e.target.value || null)}
                    className={selectClass}
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Status</p>
                  <select
                    aria-label="Status"
                    value={ticket.status}
                    disabled={isUpdatingStatus}
                    onChange={(e) => updateStatus(e.target.value as TicketStatus)}
                    className={selectClass}
                  >
                    <option value={TicketStatus.open}>Open</option>
                    <option value={TicketStatus.resolved}>Resolved</option>
                    <option value={TicketStatus.closed}>Closed</option>
                  </select>
                </div>

                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Category</p>
                  <select
                    aria-label="Category"
                    value={ticket.category}
                    disabled={isUpdatingCategory}
                    onChange={(e) => updateCategory(e.target.value as TicketCategory)}
                    className={selectClass}
                  >
                    <option value={TicketCategory.general_question}>General</option>
                    <option value={TicketCategory.technical_question}>Technical</option>
                    <option value={TicketCategory.refund_request}>Refund</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
