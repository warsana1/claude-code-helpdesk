import { useState } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, Sparkles, ScrollText } from "lucide-react";
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

async function summarizeTicket(ticketId: number): Promise<string> {
  const { data } = await axios.post<{ summary: string }>(
    `/api/tickets/${ticketId}/summarize`,
    {},
    { withCredentials: true },
  );
  return data.summary;
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
  "w-full px-3 py-2 rounded-lg border border-border bg-input text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all disabled:opacity-50 appearance-none";

const metaLabel = "text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5";

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
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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

  const { mutate: runSummarize, isPending: isSummarizing } = useMutation({
    mutationFn: () => summarizeTicket(ticketId),
    onSuccess: (text) => {
      setSummary(text);
      setSummaryError(null);
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? err.message
        : "Failed to generate summary.";
      setSummaryError(msg);
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
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to tickets
        </Link>

        {isPending && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="h-6 w-2/3 bg-muted rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
              <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
            <div className="space-y-2 pt-4 border-t border-border/50">
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-muted rounded animate-pulse" />
            </div>
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-500 dark:text-red-400">Failed to load ticket.</p>
        )}

        {ticket && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-border/50">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-lg font-semibold text-foreground leading-snug">
                  {ticket.subject}
                </h1>
                <span className="text-muted-foreground font-mono text-sm shrink-0 mt-0.5">
                  #{ticket.id}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_240px] divide-x divide-border/50">
              {/* Left column */}
              <div className="p-6 space-y-6 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={metaLabel}>From</p>
                    <p className="font-medium text-foreground/80">{ticket.fromName}</p>
                    <p className="text-muted-foreground text-xs">{ticket.fromEmail}</p>
                  </div>
                  <div>
                    <p className={metaLabel}>Created</p>
                    <p className="text-secondary-foreground text-xs">{new Date(ticket.createdAt).toLocaleString()}</p>
                    <p className={`${metaLabel} mt-2`}>Updated</p>
                    <p className="text-secondary-foreground text-xs">{new Date(ticket.updatedAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-5">
                  <p className={metaLabel}>Message</p>
                  <div className="text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed">
                    {ticket.body || <span className="text-muted-foreground italic">No message body.</span>}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => runSummarize()}
                      disabled={isSummarizing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-accent text-muted-foreground hover:text-secondary-foreground text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ScrollText size={12} />
                      {isSummarizing ? "Summarizing…" : "Summarize"}
                    </button>
                  </div>
                  {summaryError && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-2">{summaryError}</p>
                  )}
                  {summary && !isSummarizing && (
                    <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Summary</p>
                      <p className="text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed">{summary}</p>
                    </div>
                  )}
                </div>

                {replies.length > 0 && (
                  <div className="border-t border-border/50 pt-5">
                    <p className={metaLabel}>Replies ({replies.length})</p>
                    <div className="space-y-3">
                      {replies.map((reply) => (
                        <div
                          key={reply.id}
                          className={`rounded-lg p-3.5 text-sm border ${
                            reply.senderType === SenderType.agent
                              ? "bg-primary/5 border-primary/20"
                              : "bg-muted border-border/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-foreground/80 text-sm">
                              {reply.senderType === SenderType.agent
                                ? (reply.user?.name ?? "Agent")
                                : ticket.fromName}
                            </span>
                            <span
                              className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                reply.senderType === SenderType.agent
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {reply.senderType}
                            </span>
                            <span className="ml-auto text-muted-foreground text-xs">
                              {new Date(reply.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {reply.bodyHtml ? (
                            <div
                              className="text-secondary-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{ __html: reply.bodyHtml }}
                            />
                          ) : (
                            <p className="text-secondary-foreground whitespace-pre-wrap leading-relaxed">
                              {reply.body}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-border/50 pt-5">
                  <p className={metaLabel}>Reply</p>
                  <textarea
                    aria-label="Reply body"
                    value={replyBody}
                    onChange={(e) => { setReplyBody(e.target.value); setPolishError(null); }}
                    placeholder="Write a reply…"
                    rows={4}
                    disabled={isSubmittingReply}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 resize-none disabled:opacity-50 transition-all"
                  />
                  {polishError && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{polishError}</p>
                  )}
                  <div className="flex justify-end gap-2 mt-2.5">
                    <button
                      onClick={() => {
                        const trimmed = replyBody.trim();
                        if (trimmed) runPolish(trimmed);
                      }}
                      disabled={isPolishing || isSubmittingReply || replyBody.trim().length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-border bg-muted hover:bg-accent text-muted-foreground hover:text-secondary-foreground text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <Sparkles size={13} />
                      {isPolishing ? "Polishing…" : "Polish"}
                    </button>
                    <button
                      onClick={() => {
                        const trimmed = replyBody.trim();
                        if (trimmed) submitReply(trimmed);
                      }}
                      disabled={isSubmittingReply || isPolishing || replyBody.trim().length === 0}
                      className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmittingReply ? "Sending…" : "Send reply"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <div className="p-6 space-y-5 text-sm">
                <div>
                  <p className={metaLabel}>Assigned to</p>
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
                  <p className={metaLabel}>Status</p>
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
                  <p className={metaLabel}>Category</p>
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
