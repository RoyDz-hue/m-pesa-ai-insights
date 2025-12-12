import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to enable real-time updates for transactions and related data.
 * Call this once at the app level to automatically refresh queries
 * when new transactions arrive from Android app.
 */
export function useRealtimeTransactions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to mpesa_transactions changes
    const transactionsChannel = supabase
      .channel("mpesa-transactions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mpesa_transactions",
        },
        (payload) => {
          console.log("Transaction update:", payload.eventType, payload.new);
          
          // Invalidate relevant queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
          queryClient.invalidateQueries({ queryKey: ["chart-data"] });
          queryClient.invalidateQueries({ queryKey: ["transactions-by-type"] });
        }
      )
      .subscribe();

    // Subscribe to review_queue changes
    const reviewChannel = supabase
      .channel("review-queue-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "review_queue",
        },
        (payload) => {
          console.log("Review queue update:", payload.eventType);
          
          queryClient.invalidateQueries({ queryKey: ["review-queue"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }
      )
      .subscribe();

    // Subscribe to mobile_clients changes
    const clientsChannel = supabase
      .channel("mobile-clients-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mobile_clients",
        },
        (payload) => {
          console.log("Mobile client update:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["mobile-clients"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(reviewChannel);
      supabase.removeChannel(clientsChannel);
    };
  }, [queryClient]);
}

/**
 * Hook to get connected mobile clients
 */
export function useMobileClients() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from("mobile_clients")
        .select("*")
        .eq("is_active", true)
        .order("last_sync_at", { ascending: false });
      
      queryClient.setQueryData(["mobile-clients"], data);
    };
    
    fetchClients();
  }, [queryClient]);
}
