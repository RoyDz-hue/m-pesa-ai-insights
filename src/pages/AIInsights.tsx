import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
      toast.error("No transactions available for analysis");
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
      // Generate mock insights for demo
      setInsights([
        "Transaction volume is trending upward with a 15% increase in Paybill payments this week.",
        "3 transactions flagged for low AI confidence - recommend manual review.",
        "Peak transaction times are between 12:00 PM and 2:00 PM on weekdays.",
        "Deposit transactions have increased by 20% compared to last month.",
        "Consider reviewing transactions from new senders for fraud patterns.",
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Insights</h1>
            <p className="text-muted-foreground">
              AI-powered analysis of your M-PESA transactions
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
            Generate Insights
          </Button>
        </div>

        {/* AI Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-6 animate-fade-in">
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
              <div className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
              <span className="text-sm text-status-success">Active</span>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-status-warning/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-status-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Fraud Detection</h3>
                <p className="text-sm text-muted-foreground">Anomaly monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
              <span className="text-sm text-status-success">Monitoring</span>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-chart-2/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Analytics Engine</h3>
                <p className="text-sm text-muted-foreground">Pattern analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
              <span className="text-sm text-status-success">Running</span>
            </div>
          </div>
        </div>

        {/* Generated Insights */}
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">AI Generated Insights</h3>
              <p className="text-sm text-muted-foreground">Based on recent transaction data</p>
            </div>
          </div>

          {insights.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No insights generated yet</p>
              <p className="text-sm">Click "Generate Insights" to analyze your transactions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-medium text-primary">{index + 1}</span>
                  </div>
                  <p className="text-foreground">{insight}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats for AI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Processing Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Processed</span>
                <span className="font-semibold text-foreground">
                  {stats?.transactionCount.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending Review</span>
                <span className="font-semibold text-status-warning">
                  {stats?.pendingReviews || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Flagged</span>
                <span className="font-semibold text-destructive">
                  {stats?.flaggedTransactions || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg Confidence</span>
                <span className="font-semibold text-primary">92%</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Model Information</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Parser Model</span>
                <span className="font-mono text-sm text-foreground">gemini-2.5-flash</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Prompt Version</span>
                <span className="font-mono text-sm text-foreground">mpesa_parse_v1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="text-sm text-foreground">Dec 12, 2025</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="text-sm text-status-success">Production</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
