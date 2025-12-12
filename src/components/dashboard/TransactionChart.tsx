import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useChartData } from "@/hooks/use-mpesa";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";

export function TransactionChart() {
  const { data, isLoading, error } = useChartData(30);

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6 h-80 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.length) {
    return (
      <div className="glass-card rounded-xl p-6 h-80 flex items-center justify-center">
        <p className="text-muted-foreground">No transaction data available</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return `Ksh ${value.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM d");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Transaction Volume</h3>
        <p className="text-sm text-muted-foreground">Last 30 days</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [formatCurrency(value), "Amount"]}
              labelFormatter={formatDate}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorAmount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
