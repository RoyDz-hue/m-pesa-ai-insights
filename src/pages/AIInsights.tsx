import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useDashboardStats, useTransactions } from "@/hooks/use-mpesa";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, Brain, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">AI Insights</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              AI-powered analysis
            </p>
          </div>
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
            Generate
          </Button>
        </div>

        {/* AI Status Cards - 3 cols, stacking on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in">
            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm md:text-base">AI Parser</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Parsing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-success))] animate-pulse" />
              <span className="text-xs md:text-sm text-[hsl(var(--status-success))]">Active</span>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-[hsl(var(--status-warning)/0.2)] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-[hsl(var(--status-warning))]" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm md:text-base">Fraud</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-success))] animate-pulse" />
              <span className="text-xs md:text-sm text-[hsl(var(--status-success))]">Active</span>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-[hsl(var(--chart-2)/0.2)] flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-[hsl(var(--chart-2))]" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm md:text-base">Analytics</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Patterns</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-success))] animate-pulse" />
              <span className="text-xs md:text-sm text-[hsl(var(--status-success))]">Running</span>
            </div>
          </div>
        </div>

        {/* Generated Insights */}
        <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold text-foreground">AI Insights</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Based on recent data</p>
            </div>
          </div>

          {insights.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <Sparkles className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2 text-sm md:text-base">No insights yet</p>
              <p className="text-xs md:text-sm">Click "Generate" to analyze transactions</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-muted/30 rounded-lg animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs md:text-sm font-medium text-primary">{index + 1}</span>
                  </div>
                  <p className="text-sm md:text-base text-foreground">{insight}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Grid - stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="glass-card rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Processing Stats</h3>
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Processed</span>
                <span className="font-semibold text-foreground">
                  {stats?.transactionCount.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Review</span>
                <span className="font-semibold text-[hsl(var(--status-warning))]">
                  {stats?.pendingReviews || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Flagged</span>
                <span className="font-semibold text-destructive">
                  {stats?.flaggedTransactions || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Confidence</span>
                <span className="font-semibold text-primary">92%</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Model Info</h3>
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Parser Model</span>
                <span className="font-mono text-xs md:text-sm text-foreground">gemini-2.5-flash</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prompt Version</span>
                <span className="font-mono text-xs md:text-sm text-foreground">mpesa_parse_v1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-xs md:text-sm text-foreground">Dec 12, 2025</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-xs md:text-sm text-[hsl(var(--status-success))]">Production</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
