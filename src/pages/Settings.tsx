import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Bell, Shield, Zap } from "lucide-react";

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            System configuration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Mobile Client Settings */}
          <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm md:text-base">Mobile Client</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Android config</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm">Auto-sync</Label>
                  <p className="text-xs text-muted-foreground">Upload new transactions</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm">Background</Label>
                  <p className="text-xs text-muted-foreground">Process SMS in background</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm">Notifications</Label>
                  <p className="text-xs text-muted-foreground">Capture M-PESA notifications</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-[hsl(var(--status-warning)/0.2)] flex items-center justify-center flex-shrink-0">
                <Bell className="h-4 w-4 md:h-5 md:w-5 text-[hsl(var(--status-warning))]" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm md:text-base">Alerts</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Preferences</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm">High-Risk</Label>
                  <p className="text-xs text-muted-foreground">Suspicious alerts</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm">Review Queue</Label>
                  <p className="text-xs text-muted-foreground">Items need review</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm">Daily Summary</Label>
                  <p className="text-xs text-muted-foreground">Transaction summary</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-[hsl(var(--chart-3)/0.2)] flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 md:h-5 md:w-5 text-[hsl(var(--chart-3))]" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm md:text-base">AI Config</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Processing settings</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="confidence-threshold" className="text-sm">Confidence Threshold</Label>
                <Input
                  id="confidence-threshold"
                  type="number"
                  defaultValue="0.85"
                  min="0"
                  max="1"
                  step="0.05"
                  className="mt-1.5 bg-secondary/50"
                />
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  Below this goes to review
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm">Auto-Clean</Label>
                  <p className="text-xs text-muted-foreground">High confidence auto-approve</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm">Fraud Detection</Label>
                  <p className="text-xs text-muted-foreground">AI fraud detection</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm md:text-base">Security</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Settings</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm">2FA</Label>
                  <p className="text-xs text-muted-foreground">Two-factor auth</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm">Session Timeout</Label>
                  <p className="text-xs text-muted-foreground">Auto-logout</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm">Audit Logging</Label>
                  <p className="text-xs text-muted-foreground">Log user actions</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
