import { useRealtimeTransactions } from "@/hooks/use-realtime-transactions";

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  // Enable real-time subscriptions for the entire app
  useRealtimeTransactions();

  return <>{children}</>;
}
