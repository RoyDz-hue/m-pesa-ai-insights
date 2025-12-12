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
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Transaction analytics
          </p>
        </div>

        {/* Summary Stats - 2 cols on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="glass-card rounded-xl p-4 md:p-6 text-center">
            <p className="text-xs md:text-sm text-muted-foreground">Total Volume</p>
            <p className="text-xl md:text-3xl font-bold text-primary mt-1 md:mt-2">
              {statsLoading ? "..." : formatCurrency(stats?.totalThisMonth || 0)}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">This month</p>
          </div>
          <div className="glass-card rounded-xl p-4 md:p-6 text-center">
            <p className="text-xs md:text-sm text-muted-foreground">Transactions</p>
            <p className="text-xl md:text-3xl font-bold text-foreground mt-1 md:mt-2">
              {statsLoading ? "..." : stats?.transactionCount.toLocaleString() || 0}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">This month</p>
          </div>
          <div className="glass-card rounded-xl p-4 md:p-6 text-center">
            <p className="text-xs md:text-sm text-muted-foreground">Average</p>
            <p className="text-xl md:text-3xl font-bold text-foreground mt-1 md:mt-2">
              {statsLoading ? "..." : formatCurrency(stats?.avgAmount || 0)}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Per transaction</p>
          </div>
          <div className="glass-card rounded-xl p-4 md:p-6 text-center">
            <p className="text-xs md:text-sm text-muted-foreground">Types</p>
            <p className="text-xl md:text-3xl font-bold text-foreground mt-1 md:mt-2">
              {typeLoading ? "..." : typeData?.length || 0}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Categories</p>
          </div>
        </div>

        {/* Charts Row - stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <TransactionChart />
          <TransactionTypePieChart />
        </div>

        {/* Transaction Volume by Type */}
        <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in">
          <div className="mb-3 md:mb-4">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Volume by Type</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Total per category</p>
          </div>
          <div className="h-64 md:h-80">
            {typeLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !typeData?.length ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
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
                    fontSize={10}
                  />
                  <YAxis
                    type="category"
                    dataKey="type"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
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
        <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in">
          <div className="mb-3 md:mb-4">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Daily Count</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Transactions per day</p>
          </div>
          <div className="h-48 md:h-64">
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !chartData?.length ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
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
                    fontSize={10}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
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
