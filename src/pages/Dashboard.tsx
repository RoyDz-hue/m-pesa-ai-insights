import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { TransactionChart } from "@/components/dashboard/TransactionChart";
import { TransactionTypePieChart } from "@/components/dashboard/TransactionTypePieChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { useDashboardStats } from "@/hooks/use-mpesa";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  ArrowLeftRight,
  Activity,
  Flag,
  LayoutGrid,
  BarChart3,
  Clock,
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
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            M-PESA transaction monitoring
          </p>
        </div>

        {/* Horizontal Tabs for Dashboard Sections */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-secondary/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="data-[state=active]:bg-card rounded-lg">
              <LayoutGrid className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="data-[state=active]:bg-card rounded-lg">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Charts</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="data-[state=active]:bg-card rounded-lg">
              <Clock className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Recent</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Stats Grid - Updated to remove pendingReviews */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <StatCard
                title="Today"
                value={isLoading ? "..." : formatCurrency(stats?.totalToday || 0)}
                icon={DollarSign}
                variant="success"
              />
              <StatCard
                title="Month"
                value={isLoading ? "..." : formatCurrency(stats?.totalThisMonth || 0)}
                icon={TrendingUp}
              />
              <StatCard
                title="Count"
                value={isLoading ? "..." : stats?.transactionCount.toLocaleString() || "0"}
                icon={ArrowLeftRight}
              />
              <StatCard
                title="Average"
                value={isLoading ? "..." : formatCurrency(stats?.avgAmount || 0)}
                icon={Activity}
              />
              <StatCard
                title="Flagged"
                value={isLoading ? "..." : stats?.flaggedTransactions || 0}
                icon={Flag}
                variant={stats?.flaggedTransactions ? "danger" : "default"}
              />
            </div>

            {/* AI Status */}
            <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in">
              <div className="mb-4">
                <h3 className="text-base md:text-lg font-semibold text-foreground">System Status</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Real-time AI processing</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-[hsl(var(--status-success))] animate-pulse" />
                    <span className="text-sm text-foreground">AI Parser</span>
                  </div>
                  <span className="text-[hsl(var(--status-success))] text-sm">Online</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-[hsl(var(--status-success))] animate-pulse" />
                    <span className="text-sm text-foreground">Fraud Detection</span>
                  </div>
                  <span className="text-[hsl(var(--status-success))] text-sm">Active</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-[hsl(var(--status-success))] animate-pulse" />
                    <span className="text-sm text-foreground">Deduplication</span>
                  </div>
                  <span className="text-[hsl(var(--status-success))] text-sm">Running</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <TransactionChart />
              </div>
              <div>
                <TransactionTypePieChart />
              </div>
            </div>
          </TabsContent>

          {/* Recent Tab */}
          <TabsContent value="recent" className="mt-4">
            <RecentTransactions />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
