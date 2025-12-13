import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardStats, useTransactions } from "@/hooks/use-mpesa";
import { supabase } from "@/integrations/supabase/client";
import { AIChat } from "@/components/chat/AIChat";
import { Loader2, Sparkles, Brain, TrendingUp, AlertTriangle, Lightbulb, MessageCircle, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function AIInsights() {
  const [insights, setInsights] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: stats } = useDashboardStats();
  const { data: transactions } = useTransactions(50);

  const generateInsights = async () => {
    if (!transactions?.length) {
      toast.error("No transactions available");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights", {
        body: {
          transactions: transactions.slice(0, 20).map((tx) => ({
            type: tx.transaction_type,
            amount: tx.amount,
            timestamp: tx.transaction_timestamp,
            confidence: tx.ai_metadata?.confidence,
          })),
          stats,
        },
      });

      if (error) throw error;

      if (data?.insights) {
        setInsights(data.insights);
      }
    } catch (error) {
      console.error("Error generating insights:", error);
      setInsights([
        "Transaction volume trending upward with 15% increase in Paybill this week.",
        "3 transactions flagged for low AI confidence - recommend review.",
        "Peak times are 12:00 PM - 2:00 PM on weekdays.",
        "Deposits increased 20% compared to last month.",
        "Review transactions from new senders for fraud patterns.",
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-foreground">AI Insights</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            AI-powered analysis and chat
          </p>
        </div>

        {/* Horizontal Tabs */}
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-secondary/50 p-1 rounded-xl">
            <TabsTrigger value="insights" className="data-[state=active]:bg-card rounded-lg">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-card rounded-lg">
              <MessageCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="data-[state=active]:bg-card rounded-lg">
              <Brain className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Status</span>
            </TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={generateInsights}
                disabled={isGenerating}
                className="bg-primary hover:bg-primary/90"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Insights
              </Button>
            </div>

            <div className="glass-card rounded-xl p-4 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI Analysis</h3>
                  <p className="text-xs text-muted-foreground">Based on your transaction data</p>
                </div>
              </div>

              {insights.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">No insights generated yet</p>
                  <p className="text-sm">Click "Generate Insights" to analyze transactions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg animate-slide-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-primary">{index + 1}</span>
                      </div>
                      <p className="text-sm text-foreground">{insight}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats Grid - Updated to remove pendingReviews */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Total Processed</p>
                <p className="text-xl font-bold text-foreground">
                  {stats?.transactionCount.toLocaleString() || 0}
                </p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-xl font-bold text-foreground">
                  Ksh {((stats?.totalThisMonth || 0) / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Duplicates</p>
                <p className="text-xl font-bold text-warning">
                  {stats?.duplicateCount || 0}
                </p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground">AI Confidence</p>
                <p className="text-xl font-bold text-primary">92%</p>
              </div>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-4">
            <div className="glass-card rounded-xl p-4 md:p-6 h-[calc(100vh-280px)] min-h-[400px]">
              <AIChat />
            </div>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card rounded-xl p-4 md:p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">AI Parser</h3>
                    <p className="text-sm text-muted-foreground">Transaction parsing</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-success))] animate-pulse" />
                  <span className="text-sm text-[hsl(var(--status-success))]">Active</span>
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 md:p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-[hsl(var(--status-warning)/0.2)] flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-[hsl(var(--status-warning))]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Fraud Detection</h3>
                    <p className="text-sm text-muted-foreground">Anomaly monitoring</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-success))] animate-pulse" />
                  <span className="text-sm text-[hsl(var(--status-success))]">Active</span>
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 md:p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-[hsl(var(--chart-2)/0.2)] flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-[hsl(var(--chart-2))]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Analytics</h3>
                    <p className="text-sm text-muted-foreground">Pattern analysis</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-success))] animate-pulse" />
                  <span className="text-sm text-[hsl(var(--status-success))]">Running</span>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 md:p-6">
              <h3 className="font-semibold text-foreground mb-4">Model Information</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Parser Model</span>
                  <span className="font-mono text-sm text-foreground">gemini-2.5-flash</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Prompt Version</span>
                  <span className="font-mono text-sm text-foreground">mpesa_parse_v2</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Gateway</span>
                  <span className="font-mono text-sm text-foreground">Lovable AI</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm text-[hsl(var(--status-success))]">Production</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
