import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MpesaTransaction, TransactionStatus, TransactionType } from "@/types/mpesa";
import type { Json } from "@/integrations/supabase/types";

export function useTransactions(limit = 100) {
  return useQuery({
    queryKey: ["transactions", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mpesa_transactions")
        .select("*")
        .order("transaction_timestamp", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as unknown as MpesaTransaction[];
    },
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mpesa_transactions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as MpesaTransaction;
    },
    enabled: !!id,
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from("mpesa_transactions")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      // Get today's transactions
      const { data: todayData } = await supabase
        .from("mpesa_transactions")
        .select("amount")
        .gte("transaction_timestamp", startOfToday);

      // Get this month's transactions
      const { data: monthData } = await supabase
        .from("mpesa_transactions")
        .select("amount")
        .gte("transaction_timestamp", startOfMonth);

      // Get flagged transactions count (from review queue)
      const { count: flaggedCount } = await supabase
        .from("review_queue")
        .select("*", { count: "exact", head: true })
        .is("resolved_at", null);

      const todayTotal = todayData?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
      const monthTotal = monthData?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
      const totalCount = monthData?.length || 0;
      const avgAmount = totalCount > 0 ? monthTotal / totalCount : 0;

      return {
        totalToday: todayTotal,
        totalThisMonth: monthTotal,
        transactionCount: totalCount,
        avgAmount,
        flaggedTransactions: flaggedCount || 0,
      };
    },
  });
}

export function useChartData(days = 30) {
  return useQuery({
    queryKey: ["chart-data", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("mpesa_transactions")
        .select("amount, transaction_timestamp")
        .gte("transaction_timestamp", startDate.getTime())
        .order("transaction_timestamp", { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped = (data || []).reduce((acc: Record<string, { amount: number; count: number }>, tx) => {
        const date = new Date(tx.transaction_timestamp).toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = { amount: 0, count: 0 };
        }
        acc[date].amount += Number(tx.amount) || 0;
        acc[date].count += 1;
        return acc;
      }, {});

      return Object.entries(grouped).map(([date, stats]) => ({
        date,
        amount: stats.amount,
        count: stats.count,
      }));
    },
  });
}

export function useTransactionsByType() {
  return useQuery({
    queryKey: ["transactions-by-type"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mpesa_transactions")
        .select("transaction_type, amount");

      if (error) throw error;

      const grouped = (data || []).reduce((acc: Record<string, { count: number; amount: number }>, tx) => {
        const type = tx.transaction_type;
        if (!acc[type]) {
          acc[type] = { count: 0, amount: 0 };
        }
        acc[type].count += 1;
        acc[type].amount += Number(tx.amount) || 0;
        return acc;
      }, {});

      return Object.entries(grouped).map(([type, stats]) => ({
        type,
        count: stats.count,
        amount: stats.amount,
      }));
    },
  });
}

export function useReviewQueue() {
  return useQuery({
    queryKey: ["review-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_queue")
        .select(`
          *,
          mpesa_transactions (*)
        `)
        .is("resolved_at", null)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useResolveReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      resolution,
      transactionUpdates,
    }: {
      reviewId: string;
      resolution: string;
      transactionUpdates?: Record<string, unknown>;
    }) => {
      // Update the review queue item
      const { error: reviewError } = await supabase
        .from("review_queue")
        .update({
          resolved_at: new Date().toISOString(),
          resolution,
        })
        .eq("id", reviewId);

      if (reviewError) throw reviewError;

      // Update the transaction if there are changes
      if (transactionUpdates) {
        const { data: review } = await supabase
          .from("review_queue")
          .select("mpesa_id")
          .eq("id", reviewId)
          .single();

        if (review) {
          const { error: txError } = await supabase
            .from("mpesa_transactions")
            .update(transactionUpdates as any)
            .eq("id", review.mpesa_id);

          if (txError) throw txError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
