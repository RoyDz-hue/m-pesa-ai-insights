import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Analytics from "./pages/Analytics";
import AIInsights from "./pages/AIInsights";
import Settings from "./pages/Settings";
import PublicForm from "./pages/PublicForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <OfflineProvider>
        <RealtimeProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
              <Route path="/transactions" element={<AuthGuard><Transactions /></AuthGuard>} />
              <Route path="/analytics" element={<AuthGuard><Analytics /></AuthGuard>} />
              <Route path="/ai-insights" element={<AuthGuard><AIInsights /></AuthGuard>} />
              <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
              <Route path="/review" element={<AuthGuard><Transactions /></AuthGuard>} />
              <Route path="/form/:slug" element={<PublicForm />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RealtimeProvider>
      </OfflineProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
