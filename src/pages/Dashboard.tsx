import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { TransactionChart } from "@/components/dashboard/TransactionChart";
import { TransactionTypePieChart } from "@/components/dashboard/TransactionTypePieChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { useDashboardStats } from "@/hooks/use-mpesa";
import {
  DollarSign,
  TrendingUp,
  ArrowLeftRight,
  AlertTriangle,
  Activity,
  Flag,
} from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            M-PESA transaction monitoring overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Today's Volume"
            value={isLoading ? "..." : formatCurrency(stats?.totalToday || 0)}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="This Month"
            value={isLoading ? "..." : formatCurrency(stats?.totalThisMonth || 0)}
            icon={TrendingUp}
          />
          <StatCard
            title="Transactions"
            value={isLoading ? "..." : stats?.transactionCount.toLocaleString() || "0"}
            icon={ArrowLeftRight}
          />
          <StatCard
            title="Avg Amount"
            value={isLoading ? "..." : formatCurrency(stats?.avgAmount || 0)}
            icon={Activity}
          />
          <StatCard
            title="Pending Review"
            value={isLoading ? "..." : stats?.pendingReviews || 0}
            icon={AlertTriangle}
            variant={stats?.pendingReviews ? "warning" : "default"}
          />
          <StatCard
            title="Flagged"
            value={isLoading ? "..." : stats?.flaggedTransactions || 0}
            icon={Flag}
            variant={stats?.flaggedTransactions ? "danger" : "default"}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TransactionChart />
          </div>
          <div>
            <TransactionTypePieChart />
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTransactions />
          <div className="glass-card rounded-xl p-6 animate-fade-in">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">AI Processing Status</h3>
              <p className="text-sm text-muted-foreground">Real-time parsing performance</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-status-success animate-pulse" />
                  <span className="text-foreground">AI Parser</span>
                </div>
                <span className="text-status-success text-sm">Online</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-status-success animate-pulse" />
                  <span className="text-foreground">Fraud Detection</span>
                </div>
                <span className="text-status-success text-sm">Active</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-status-success animate-pulse" />
                  <span className="text-foreground">Deduplication</span>
                </div>
                <span className="text-status-success text-sm">Running</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
