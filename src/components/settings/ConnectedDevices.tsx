import { useState } from "react";
import { Smartphone, Power, PowerOff, Trash2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  useDevices, 
  useDeactivateDevice, 
  useActivateDevice, 
  useDeleteDevice,
  type Device 
} from "@/hooks/use-devices";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConnectedDevices() {
  const { data: devices, isLoading, refetch, isRefetching } = useDevices();
  const deactivateMutation = useDeactivateDevice();
  const activateMutation = useActivateDevice();
  const deleteMutation = useDeleteDevice();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleToggleActive = async (device: Device) => {
    setProcessingId(device.id);
    try {
      if (device.is_active) {
        await deactivateMutation.mutateAsync(device.id);
        toast.success(`${device.device_name || "Device"} deactivated`);
      } else {
        await activateMutation.mutateAsync(device.id);
        toast.success(`${device.device_name || "Device"} activated`);
      }
    } catch {
      toast.error("Failed to update device");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (device: Device) => {
    setProcessingId(device.id);
    try {
      await deleteMutation.mutateAsync(device.id);
      toast.success(`${device.device_name || "Device"} removed`);
    } catch {
      toast.error("Failed to remove device");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in lg:col-span-2">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm md:text-base">Connected Devices</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              {devices?.filter(d => d.is_active).length || 0} active
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !devices?.length ? (
        <div className="text-center py-8 text-muted-foreground">
          <Smartphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No devices connected</p>
          <p className="text-xs mt-1">Install the Android app to start syncing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  device.is_active ? 'bg-[hsl(var(--status-success)/0.2)]' : 'bg-muted'
                }`}>
                  <Smartphone className={`h-4 w-4 ${
                    device.is_active ? 'text-[hsl(var(--status-success))]' : 'text-muted-foreground'
                  }`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-foreground truncate">
                      {device.device_name || device.device_model || "Unknown Device"}
                    </p>
                    <Badge variant={device.is_active ? "default" : "secondary"} className="text-[10px]">
                      {device.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {device.device_model && <span>{device.device_model}</span>}
                    {device.app_version && <span>v{device.app_version}</span>}
                    {device.last_sync_at && (
                      <span>• {formatDistanceToNow(new Date(device.last_sync_at), { addSuffix: true })}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggleActive(device)}
                  disabled={processingId === device.id}
                >
                  {processingId === device.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : device.is_active ? (
                    <PowerOff className="h-4 w-4 text-[hsl(var(--status-warning))]" />
                  ) : (
                    <Power className="h-4 w-4 text-[hsl(var(--status-success))]" />
                  )}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={processingId === device.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Device</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove "{device.device_name || device.device_model || "this device"}"? 
                        The device will need to re-register to sync again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(device)}>
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
