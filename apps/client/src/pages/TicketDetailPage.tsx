import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { TicketStatus, TicketCategory, TicketSource } from "@helpdesk/core";
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

async function fetchTicket(id: number): Promise<TicketDetail> {
  const { data } = await axios.get<TicketDetail>(`/api/tickets/${id}`, {
    withCredentials: true,
  });
  return data;
}

const categoryLabel: Record<TicketCategory, string> = {
  [TicketCategory.general_question]: "General",
  [TicketCategory.technical_question]: "Technical",
  [TicketCategory.refund_request]: "Refund",
};

const statusStyles: Record<TicketStatus, string> = {
  [TicketStatus.open]: "bg-yellow-100 text-yellow-700",
  [TicketStatus.resolved]: "bg-green-100 text-green-700",
  [TicketStatus.closed]: "bg-gray-100 text-gray-600",
};

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);

  const { data: ticket, isPending, isError } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
    enabled: !isNaN(ticketId),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-10">
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
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[ticket.status]}`}
                >
                  {ticket.status}
                </span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {categoryLabel[ticket.category]}
                </span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm border-b border-gray-100">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">From</p>
                <p className="font-medium text-gray-800">{ticket.fromName}</p>
                <p className="text-gray-500">{ticket.fromEmail}</p>
              </div>
              <div>
                <p className="text-gray-700"><span className="text-gray-400 text-xs uppercase tracking-wide">Assigned to:</span> <span className="italic text-gray-400">Unassigned</span></p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Created</p>
                <p className="text-gray-700">
                  {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Last updated</p>
                <p className="text-gray-700">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Message</p>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {ticket.body || <span className="text-gray-400 italic">No message body.</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
