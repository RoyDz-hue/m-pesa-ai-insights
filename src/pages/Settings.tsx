import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Shield, Zap, User, Save, Loader2, FileText } from "lucide-react";
import { ConnectedDevices } from "@/components/settings/ConnectedDevices";
import { FormBuilder } from "@/components/settings/FormBuilder";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  notification_preferences: NotificationPreferences | null;
}

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        const profileData: Profile = {
          id: data.id,
          user_id: data.user_id,
          display_name: data.display_name,
          avatar_url: data.avatar_url,
          phone: data.phone,
          notification_preferences: data.notification_preferences as unknown as NotificationPreferences | null,
        };
        setProfile(profileData);
        setDisplayName(profileData.display_name || "");
        setPhone(profileData.phone || "");
        const prefs = profileData.notification_preferences;
        setEmailNotifications(prefs?.email ?? true);
        setPushNotifications(prefs?.push ?? true);
        setSmsNotifications(prefs?.sms ?? false);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        display_name: displayName || null,
        phone: phone || null,
        notification_preferences: {
          email: emailNotifications,
          push: pushNotifications,
          sms: smsNotifications,
        },
      };

      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert(profileData);
        if (error) throw error;
      }

      toast.success("Profile saved successfully");
      fetchProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            System configuration & profile
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile & Config
            </TabsTrigger>
            <TabsTrigger value="forms" className="gap-2">
              <FileText className="h-4 w-4" />
              Create Forms
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Profile Settings */}
              <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in lg:col-span-2">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm md:text-base">Profile</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">Your account details</p>
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 md:col-span-2">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xl">
                          {displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{user?.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Member since {new Date(user?.created_at || "").toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="display-name" className="text-sm">Display Name</Label>
                      <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="mt-1.5 bg-secondary/50"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+254..."
                        className="mt-1.5 bg-secondary/50"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Connected Devices */}
              <ConnectedDevices />

              {/* Notification Settings */}
              <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
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
                      <Label className="text-sm">Email Alerts</Label>
                      <p className="text-xs text-muted-foreground">Receive email notifications</p>
                    </div>
                    <Switch 
                      checked={emailNotifications} 
                      onCheckedChange={setEmailNotifications} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <Label className="text-sm">Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">Browser/app push</p>
                    </div>
                    <Switch 
                      checked={pushNotifications} 
                      onCheckedChange={setPushNotifications} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <Label className="text-sm">SMS Alerts</Label>
                      <p className="text-xs text-muted-foreground">Critical alerts via SMS</p>
                    </div>
                    <Switch 
                      checked={smsNotifications} 
                      onCheckedChange={setSmsNotifications} 
                    />
                  </div>
                </div>
              </div>

              {/* AI Settings */}
              <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
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
              <div className="glass-card rounded-xl p-4 md:p-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
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
            <div className="flex justify-end mt-6">
              <Button 
                className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="forms" className="mt-6">
            <FormBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
