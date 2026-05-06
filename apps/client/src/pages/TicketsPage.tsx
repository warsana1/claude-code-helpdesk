import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { TicketStatus, TicketCategory, TicketSource, type TicketSortField } from "@helpdesk/core";
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

async function fetchTickets(
  sortBy: TicketSortField | undefined,
  sortOrder: "asc" | "desc"
): Promise<Ticket[]> {
  const params: Record<string, string> = { sortOrder };
  if (sortBy) params.sortBy = sortBy;
  const { data } = await axios.get<Ticket[]>("/api/tickets", {
    params,
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

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: TicketStatus.open },
  { label: "Resolved", value: TicketStatus.resolved },
  { label: "Closed", value: TicketStatus.closed },
];

const columnHelper = createColumnHelper<Ticket>();

const columns: ColumnDef<Ticket, any>[] = [
  columnHelper.accessor("id", {
    header: "#",
    enableSorting: true,
    cell: (info) => (
      <span className="text-gray-400 font-mono text-xs">#{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("subject", {
    header: "Subject",
    enableSorting: true,
    cell: (info) => (
      <span className="text-gray-900 font-medium max-w-xs truncate block">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("fromName", {
    header: "From",
    enableSorting: true,
    cell: (info) => {
      const ticket = info.row.original;
      return (
        <div>
          <div>{ticket.fromName}</div>
          <div className="text-xs text-gray-400">{ticket.fromEmail}</div>
        </div>
      );
    },
  }),
  columnHelper.accessor("category", {
    header: "Category",
    enableSorting: true,
    cell: (info) => (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
        {categoryLabel[info.row.original.category]}
      </span>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    enableSorting: true,
    cell: (info) => (
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[info.row.original.status]}`}
      >
        {info.row.original.status}
      </span>
    ),
  }),
  columnHelper.display({
    id: "assignee",
    header: "Assigned To",
    enableSorting: false,
    cell: (info) =>
      info.row.original.assignee?.name ?? (
        <span className="text-gray-400">—</span>
      ),
  }),
  columnHelper.accessor("createdAt", {
    header: "Received",
    enableSorting: true,
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
];

export function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const sortBy = sorting[0]?.id as TicketSortField | undefined;
  const sortOrder: "asc" | "desc" = sorting[0]?.desc ? "desc" : "asc";

  const { data: tickets, isPending, isError } = useQuery({
    queryKey: ["tickets", sortBy, sortOrder],
    queryFn: () => fetchTickets(sortBy, sortOrder),
    placeholderData: (prev) => prev,
  });

  const counts = useMemo(() => {
    if (!tickets) return { all: 0, open: 0, resolved: 0, closed: 0 };
    return {
      all: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      closed: tickets.filter((t) => t.status === "closed").length,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return statusFilter === "all"
      ? tickets
      : tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const table = useReactTable({
    data: filteredTickets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel(),
  });

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
                    statusFilter === value
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500"
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
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className={`text-left px-4 py-3 font-medium text-gray-700 ${
                          canSort ? "cursor-pointer select-none" : ""
                        }`}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <>
                              {sorted === "asc" && <ChevronUp size={14} />}
                              {sorted === "desc" && <ChevronDown size={14} />}
                              {!sorted && (
                                <ChevronsUpDown
                                  size={14}
                                  className="text-gray-400"
                                />
                              )}
                            </>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isPending
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                : table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-gray-600">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isPending && filteredTickets.length === 0 && (
          <p className="mt-6 text-center text-sm text-gray-400">
            {statusFilter === "all"
              ? "No tickets yet."
              : `No ${statusFilter} tickets.`}
          </p>
        )}
        {isError && (
          <p className="mt-4 text-sm text-red-500">Failed to load tickets.</p>
        )}
      </div>
    </div>
  );
}
