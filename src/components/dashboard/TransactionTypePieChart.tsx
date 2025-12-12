import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useTransactionsByType } from "@/hooks/use-mpesa";
import { Loader2 } from "lucide-react";

const COLORS = [
  "hsl(var(--tx-deposit))",
  "hsl(var(--tx-send))",
  "hsl(var(--tx-paybill))",
  "hsl(var(--tx-till))",
  "hsl(var(--tx-withdraw))",
  "hsl(var(--tx-airtime))",
  "hsl(var(--tx-bank))",
  "hsl(var(--tx-reversal))",
];

export function TransactionTypePieChart() {
  const { data, isLoading, error } = useTransactionsByType();

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
        <p className="text-muted-foreground">No transaction type data</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Transaction Types</h3>
        <p className="text-sm text-muted-foreground">Distribution by type</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="type"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
