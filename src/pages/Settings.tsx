import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Bell, Shield, Database, Zap } from "lucide-react";

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Configure your M-PESA monitoring system
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mobile Client Settings */}
          <div className="glass-card rounded-xl p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Mobile Client</h3>
                <p className="text-sm text-muted-foreground">Android app configuration</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-sync Transactions</Label>
                  <p className="text-sm text-muted-foreground">Automatically upload new transactions</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Background Processing</Label>
                  <p className="text-sm text-muted-foreground">Process SMS in background</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notification Listener</Label>
                  <p className="text-sm text-muted-foreground">Capture M-PESA app notifications</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-status-warning/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-status-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <p className="text-sm text-muted-foreground">Alert preferences</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>High-Risk Alerts</Label>
                  <p className="text-sm text-muted-foreground">Alert on suspicious transactions</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Review Queue Notifications</Label>
                  <p className="text-sm text-muted-foreground">Notify when items need review</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Daily Summary</Label>
                  <p className="text-sm text-muted-foreground">Receive daily transaction summary</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI Configuration</h3>
                <p className="text-sm text-muted-foreground">AI processing settings</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="confidence-threshold">Confidence Threshold</Label>
                <Input
                  id="confidence-threshold"
                  type="number"
                  defaultValue="0.85"
                  min="0"
                  max="1"
                  step="0.05"
                  className="mt-1.5 bg-secondary/50"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Transactions below this threshold go to review
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Clean High Confidence</Label>
                  <p className="text-sm text-muted-foreground">Auto-approve high confidence results</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Fraud Detection</Label>
                  <p className="text-sm text-muted-foreground">Enable AI fraud detection</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Security</h3>
                <p className="text-sm text-muted-foreground">Security settings</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for login</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Audit Logging</Label>
                  <p className="text-sm text-muted-foreground">Log all user actions</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-primary hover:bg-primary/90">
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
