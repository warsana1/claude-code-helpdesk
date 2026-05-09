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
import { useTheme } from "../lib/theme";

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

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent: string;
};

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 relative overflow-hidden">
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
        style={{ background: accent }}
      />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{label}</p>
      <p className="text-3xl font-bold font-mono tracking-tight" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground/60">{sub}</p>}
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
    <div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-xl text-sm">
      <p className="font-medium text-foreground mb-0.5">{full}</p>
      <p className="text-muted-foreground text-xs">
        {count} ticket{count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

const statAccents = ["#3b82f6", "#f59e0b", "#22c55e", "#a855f7", "#06b6d4"];

export function DashboardPage() {
  const { theme } = useTheme();
  const { data, isPending, isError } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  const chartGrid = theme === "dark" ? "#1c1c30" : "#ccd7e8";
  const chartTick = theme === "dark" ? "#4a5a6e" : "#8899aa";
  const chartBar = theme === "dark" ? "#3b82f6" : "#2563eb";
  const chartCursor = theme === "dark" ? "rgba(59,130,246,0.05)" : "rgba(37,99,235,0.06)";

  if (isPending) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <div className="h-7 w-32 bg-muted rounded animate-pulse mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <div className="h-3 w-24 bg-muted rounded animate-pulse mb-3" />
                <div className="h-8 w-20 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="mt-6 bg-card border border-border rounded-xl p-6">
            <div className="h-3 w-48 bg-muted rounded animate-pulse mb-6" />
            <div className="h-64 bg-muted/50 rounded animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-sm text-red-500 dark:text-red-400">Failed to load dashboard stats.</p>
        </main>
      </div>
    );
  }

  const stats = [
    { label: "Total Tickets", value: data.totalTickets },
    { label: "Open Tickets", value: data.openTickets },
    { label: "Resolved by AI", value: data.aiResolvedTickets },
    {
      label: "AI Resolution Rate",
      value: data.aiResolvedPercent !== null ? `${data.aiResolvedPercent.toFixed(1)}%` : "—",
      sub: "of all resolved tickets",
    },
    {
      label: "Avg Resolution Time",
      value: data.avgResolutionSeconds !== null ? formatDuration(data.avgResolutionSeconds) : "—",
      sub: "resolved & closed tickets",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-foreground mb-8 tracking-tight">Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              sub={s.sub}
              accent={statAccents[i]}
            />
          ))}
        </div>

        <div className="mt-6 bg-card border border-border rounded-xl p-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-6">
            Tickets per Day — Last 30 Days
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data.ticketsPerDay}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={{ fontSize: 11, fill: chartTick, fontFamily: "Outfit" }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: chartTick, fontFamily: "Outfit" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: chartCursor }} />
              <Bar dataKey="count" fill={chartBar} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
