import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { NavBar } from "../components/NavBar";

type Ticket = {
  id: number;
  subject: string;
  fromEmail: string;
  fromName: string;
  category: "general_question" | "technical_question" | "refund_request";
  status: "open" | "resolved" | "closed";
  source: "email" | "manual";
  createdAt: string;
  assignee: { id: string; name: string } | null;
};

async function fetchTickets(): Promise<Ticket[]> {
  const { data } = await axios.get<Ticket[]>("/api/tickets", { withCredentials: true });
  return data;
}

const categoryLabel: Record<Ticket["category"], string> = {
  general_question: "General",
  technical_question: "Technical",
  refund_request: "Refund",
};

const statusStyles: Record<Ticket["status"], string> = {
  open: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

export function TicketsPage() {
  const { data: tickets, isPending, isError } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["#", "Subject", "From", "Category", "Status", "Assigned To", "Received"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-700">{h}</th>
                ))}
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
                : tickets?.map((t) => (
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
                      <td className="px-4 py-3 text-gray-600">{t.assignee?.name ?? <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
        {!isPending && tickets?.length === 0 && (
          <p className="mt-6 text-center text-sm text-gray-400">No tickets yet.</p>
        )}
        {isError && <p className="mt-4 text-sm text-red-500">Failed to load tickets.</p>}
      </div>
    </div>
  );
}
