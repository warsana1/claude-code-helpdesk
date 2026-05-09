import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { NavBar } from "../components/NavBar";

type StatsResponse = {
  totalTickets: number;
  openTickets: number;
  aiResolvedTickets: number;
  aiResolvedPercent: number | null;
  avgResolutionSeconds: number | null;
  ticketsPerDay: Array<{ date: string; count: number }>;
};

async function fetchStats(): Promise<StatsResponse> {
  const { data } = await axios.get<StatsResponse>("/api/stats", {
    withCredentials: true,
  });
  return data;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr.slice(0, 10) + "T12:00:00");
}

function formatDateLabel(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
};

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = parseDate(label ?? "");
  const full = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const count = payload[0].value ?? 0;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-sm">
      <p className="font-medium text-gray-700">{full}</p>
      <p className="text-gray-500">
        {count} ticket{count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="mt-2 h-8 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-6" />
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-sm text-red-500">Failed to load dashboard stats.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Tickets" value={data.totalTickets} />
          <StatCard label="Open Tickets" value={data.openTickets} />
          <StatCard label="Resolved by AI" value={data.aiResolvedTickets} />
          <StatCard
            label="AI Resolution Rate"
            value={
              data.aiResolvedPercent !== null
                ? `${data.aiResolvedPercent.toFixed(1)}%`
                : "—"
            }
            sub="of all resolved tickets"
          />
          <StatCard
            label="Avg Resolution Time"
            value={
              data.avgResolutionSeconds !== null
                ? formatDuration(data.avgResolutionSeconds)
                : "—"
            }
            sub="for resolved & closed tickets"
          />
        </div>

        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-6">
            Tickets per Day — Last 30 Days
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data.ticketsPerDay}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f9fafb" }} />
              <Bar
                dataKey="count"
                fill="#6366f1"
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
