import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TicketStatus, TicketCategory, TicketSource } from "@helpdesk/core";
import { NavBar } from "../components/NavBar";

type Ticket = {
  id: number;
  subject: string;
  fromEmail: string;
  fromName: string;
  category: TicketCategory;
  status: TicketStatus;
  source: TicketSource;
  createdAt: string;
  assignee: { id: string; name: string } | null;
};

type StatusFilter = "all" | TicketStatus;

async function fetchTickets(): Promise<Ticket[]> {
  const { data } = await axios.get<Ticket[]>("/api/tickets", { withCredentials: true });
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

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: TicketStatus.open },
  { label: "Resolved", value: TicketStatus.resolved },
  { label: "Closed", value: TicketStatus.closed },
];

export function TicketsPage() {
  const { data: tickets, isPending, isError } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const counts = useMemo(() => {
    if (!tickets) return { all: 0, open: 0, resolved: 0, closed: 0 };
    return {
      all: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      closed: tickets.filter((t) => t.status === "closed").length,
    };
  }, [tickets]);

  const displayed = useMemo(() => {
    if (!tickets) return [];
    const filtered =
      statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);
    return sortOrder === "desc"
      ? [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [tickets, statusFilter, sortOrder]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 mb-4">
          {STATUS_TABS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === value
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
              {!isPending && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${
                    statusFilter === value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {counts[value]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">From</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Assigned To</th>
                <th className="px-4 py-3 font-medium text-gray-700">
                  <button
                    onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
                    className="flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Received
                    {sortOrder === "desc" ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isPending
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><div className="h-4 w-8 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-48 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-36 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                    </tr>
                  ))
                : displayed.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{t.id}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium max-w-xs truncate">{t.subject}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{t.fromName}</div>
                        <div className="text-xs text-gray-400">{t.fromEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {categoryLabel[t.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[t.status]}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {t.assignee?.name ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {!isPending && displayed.length === 0 && (
          <p className="mt-6 text-center text-sm text-gray-400">
            {statusFilter === "all" ? "No tickets yet." : `No ${statusFilter} tickets.`}
          </p>
        )}
        {isError && <p className="mt-4 text-sm text-red-500">Failed to load tickets.</p>}
      </div>
    </div>
  );
}
