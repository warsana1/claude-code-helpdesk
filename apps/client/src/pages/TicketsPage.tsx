import { useState, useEffect } from "react";
import { Link } from "react-router";
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
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
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

type TicketsResponse = { data: Ticket[]; total: number };
type StatusFilter = "all" | TicketStatus;
type CategoryFilter = TicketCategory | "";

const PAGE_SIZE = 10;

async function fetchTickets(
  sortBy: TicketSortField | undefined,
  sortOrder: "asc" | "desc",
  category: CategoryFilter,
  status: StatusFilter,
  search: string,
  page: number,
): Promise<TicketsResponse> {
  const params: Record<string, string | number> = { sortOrder, pageSize: PAGE_SIZE, page };
  if (sortBy) params.sortBy = sortBy;
  if (category) params.category = category;
  if (status !== "all") params.status = status;
  if (search) params.search = search;
  const { data } = await axios.get<TicketsResponse>("/api/tickets", {
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

const statusConfig: Record<
  TicketStatus,
  { dot: string; bg: string; text: string; border: string; label: string }
> = {
  [TicketStatus.new]: {
    dot: "bg-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/25",
    label: "New",
  },
  [TicketStatus.processing]: {
    dot: "bg-purple-500",
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/25",
    label: "Processing",
  },
  [TicketStatus.open]: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/25",
    label: "Open",
  },
  [TicketStatus.resolved]: {
    dot: "bg-green-500",
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-500/25",
    label: "Resolved",
  },
  [TicketStatus.closed]: {
    dot: "bg-slate-400",
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/20",
    label: "Closed",
  },
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
      <span className="text-muted-foreground/60 font-mono text-xs">#{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("subject", {
    header: "Subject",
    enableSorting: true,
    cell: (info) => (
      <Link
        to={`/tickets/${info.row.original.id}`}
        className="text-foreground/80 font-medium max-w-xs truncate block hover:text-primary transition-colors"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("fromName", {
    header: "From",
    enableSorting: true,
    cell: (info) => {
      const ticket = info.row.original;
      return (
        <div>
          <div className="text-secondary-foreground text-sm">{ticket.fromName}</div>
          <div className="text-xs text-muted-foreground">{ticket.fromEmail}</div>
        </div>
      );
    },
  }),
  columnHelper.accessor("category", {
    header: "Category",
    enableSorting: true,
    cell: (info) => (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
        {categoryLabel[info.row.original.category]}
      </span>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    enableSorting: true,
    cell: (info) => {
      const cfg = statusConfig[info.row.original.status];
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      );
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Received",
    enableSorting: true,
    cell: (info) => (
      <span className="text-muted-foreground text-xs">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
  }),
];

export function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [sorting, categoryFilter, statusFilter, search]);

  const sortBy = sorting[0]?.id as TicketSortField | undefined;
  const sortOrder: "asc" | "desc" = sorting[0]?.desc ? "desc" : "asc";
  const hasActiveFilters = !!(categoryFilter || search);

  const { data, isPending, isError } = useQuery({
    queryKey: ["tickets", sortBy, sortOrder, categoryFilter, statusFilter, search, page],
    queryFn: () => fetchTickets(sortBy, sortOrder, categoryFilter, statusFilter, search, page),
    placeholderData: (prev) => prev,
  });

  const tickets = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Tickets</h1>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search tickets…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all w-56"
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 mb-4">
          {STATUS_TABS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                statusFilter === value
                  ? "bg-primary/10 text-primary border border-primary/25"
                  : "text-muted-foreground hover:text-secondary-foreground hover:bg-foreground/5 border border-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
          >
            <option value="">All Categories</option>
            <option value={TicketCategory.general_question}>General</option>
            <option value={TicketCategory.technical_question}>Technical</option>
            <option value={TicketCategory.refund_request}>Refund</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setCategoryFilter("");
                setSearchInput("");
                setSearch("");
              }}
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className={`text-left px-4 py-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider ${
                          canSort ? "cursor-pointer select-none hover:text-muted-foreground transition-colors" : ""
                        }`}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <>
                              {sorted === "asc" && <ChevronUp size={13} className="text-primary" />}
                              {sorted === "desc" && <ChevronDown size={13} className="text-primary" />}
                              {!sorted && <ChevronsUpDown size={13} className="text-muted-foreground/30" />}
                            </>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/50">
              {isPending
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><div className="h-4 w-8 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-48 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-36 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-20 bg-muted rounded-full animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-20 bg-muted rounded-full animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></td>
                    </tr>
                  ))
                : table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-primary/3 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              {total === 0 ? "No results" : `${rangeStart}–${rangeEnd} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs text-muted-foreground font-mono">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {!isPending && tickets.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {search
              ? `No tickets matching "${search}".`
              : statusFilter === "all"
              ? "No tickets yet."
              : `No ${statusFilter} tickets.`}
          </p>
        )}
        {isError && (
          <p className="mt-4 text-sm text-red-500 dark:text-red-400">Failed to load tickets.</p>
        )}
      </div>
    </div>
  );
}
