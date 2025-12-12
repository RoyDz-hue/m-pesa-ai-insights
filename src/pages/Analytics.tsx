import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TransactionChart } from "@/components/dashboard/TransactionChart";
import { TransactionTypePieChart } from "@/components/dashboard/TransactionTypePieChart";
import { useTransactionsByType, useChartData, useDashboardStats } from "@/hooks/use-mpesa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

export default function Analytics() {
  const { data: typeData, isLoading: typeLoading } = useTransactionsByType();
  const { data: chartData, isLoading: chartLoading } = useChartData(30);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `Ksh ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `Ksh ${(value / 1000).toFixed(1)}K`;
    }
    return `Ksh ${value.toFixed(0)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">
            Detailed transaction analytics and insights
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">Total Volume</p>
            <p className="text-3xl font-bold text-primary mt-2">
              {statsLoading ? "..." : formatCurrency(stats?.totalThisMonth || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="text-3xl font-bold text-foreground mt-2">
              {statsLoading ? "..." : stats?.transactionCount.toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">Average Amount</p>
            <p className="text-3xl font-bold text-foreground mt-2">
              {statsLoading ? "..." : formatCurrency(stats?.avgAmount || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">Transaction Types</p>
            <p className="text-3xl font-bold text-foreground mt-2">
              {typeLoading ? "..." : typeData?.length || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Active categories</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionChart />
          <TransactionTypePieChart />
        </div>

        {/* Transaction Volume by Type */}
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Volume by Transaction Type</h3>
            <p className="text-sm text-muted-foreground">Total amount per category</p>
          </div>
          <div className="h-80">
            {typeLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !typeData?.length ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    type="category"
                    dataKey="type"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Amount"]}
                  />
                  <Bar
                    dataKey="amount"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Daily Transaction Count */}
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Daily Transaction Count</h3>
            <p className="text-sm text-muted-foreground">Number of transactions per day</p>
          </div>
          <div className="h-64">
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !chartData?.length ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => new Date(d).getDate().toString()}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: number) => [value, "Transactions"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
