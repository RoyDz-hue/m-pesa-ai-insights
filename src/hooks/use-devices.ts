import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Device {
  id: string;
  device_id: string;
  device_name: string | null;
  device_model: string | null;
  os_version: string | null;
  app_version: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useDevices() {
  return useQuery({
    queryKey: ["mobile-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mobile_clients")
        .select("*")
        .order("last_sync_at", { ascending: false });

      if (error) throw error;
      return data as Device[];
    },
  });
}

export function useActiveDevices() {
  return useQuery({
    queryKey: ["mobile-clients", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mobile_clients")
        .select("*")
        .eq("is_active", true)
        .order("last_sync_at", { ascending: false });

      if (error) throw error;
      return data as Device[];
    },
  });
}

export function useDeactivateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from("mobile_clients")
        .update({ is_active: false })
        .eq("id", deviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-clients"] });
    },
  });
}

export function useActivateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from("mobile_clients")
        .update({ is_active: true })
        .eq("id", deviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-clients"] });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from("mobile_clients")
        .delete()
        .eq("id", deviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-clients"] });
    },
  });
}
