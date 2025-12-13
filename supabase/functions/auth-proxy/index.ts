import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple JWT-like token generation (for demo - use proper JWT in production)
function generateToken(payload: Record<string, any>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa(JSON.stringify({ signed: Date.now() }));
  return `${header}.${body}.${signature}`;
}

function verifyDeviceSignature(deviceId: string, signature: string): boolean {
  // In production, implement proper device signature verification
  // This is a simplified check for demo purposes
  return Boolean(deviceId && signature && signature.length > 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both naming conventions (snake_case and camelCase from Android)
    const action = body.action;
    const clientId = body.client_id || body.clientId;
    const deviceId = body.device_id || body.deviceId;
    const deviceSignature = body.device_signature || body.signature;
    const deviceName = body.device_name || body.deviceName;
    const deviceModel = body.device_model || body.deviceModel;
    const osVersion = body.os_version || body.osVersion;
    const appVersion = body.app_version || body.appVersion;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "register") {
      // Register a new mobile client
      if (!deviceId) {
        return new Response(
          JSON.stringify({ success: false, error: "device_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if device already exists
      const { data: existingClient } = await supabase
        .from("mobile_clients")
        .select("*")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (existingClient) {
        // Update existing client
        await supabase
          .from("mobile_clients")
          .update({
            device_name: deviceName,
            device_model: deviceModel,
            os_version: osVersion,
            app_version: appVersion,
            last_sync_at: new Date().toISOString(),
            is_active: true,
          })
          .eq("device_id", deviceId);

        const token = generateToken({
          client_id: existingClient.id,
          device_id: deviceId,
          exp: Date.now() + 86400000, // 24 hours
        });

        console.log(`Updated existing client: ${deviceId}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            clientId: existingClient.id,
            client_id: existingClient.id,
            device_token: existingClient.id, // Android app expects this
            token,
            expires_in: 86400,
            uploaded_at: new Date().toISOString(),
            message: "Device re-registered successfully",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new client
      const { data: newClient, error: insertError } = await supabase
        .from("mobile_clients")
        .insert({
          device_id: deviceId,
          device_name: deviceName,
          device_model: deviceModel,
          os_version: osVersion,
          app_version: appVersion,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const token = generateToken({
        client_id: newClient.id,
        device_id: deviceId,
        exp: Date.now() + 86400000, // 24 hours
      });

      console.log(`Registered new client: ${deviceId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          clientId: newClient.id,
          client_id: newClient.id,
          device_token: newClient.id, // Android app expects this
          token,
          expires_in: 86400,
          uploaded_at: new Date().toISOString(),
          message: "Device registered successfully",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "authenticate") {
      // Authenticate existing client - support both device_id and client_id
      const identifier = deviceId || clientId;
      
      if (!identifier) {
        return new Response(
          JSON.stringify({ success: false, error: "device_id or client_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try to find by device_id first, then by client_id
      let client;
      
      if (deviceId) {
        const { data } = await supabase
          .from("mobile_clients")
          .select("*")
          .eq("device_id", deviceId)
          .eq("is_active", true)
          .maybeSingle();
        client = data;
      }
      
      if (!client && clientId) {
        const { data } = await supabase
          .from("mobile_clients")
          .select("*")
          .eq("id", clientId)
          .eq("is_active", true)
          .maybeSingle();
        client = data;
      }

      if (!client) {
        // Auto-register if device_id provided but not found
        if (deviceId) {
          const { data: newClient, error: insertError } = await supabase
            .from("mobile_clients")
            .insert({
              device_id: deviceId,
              device_name: deviceName,
              device_model: deviceModel,
              os_version: osVersion,
              app_version: appVersion,
              is_active: true,
            })
            .select()
            .single();

          if (insertError) throw insertError;

          const token = generateToken({
            client_id: newClient.id,
            device_id: deviceId,
            exp: Date.now() + 86400000,
          });

          console.log(`Auto-registered new client during auth: ${deviceId}`);

          return new Response(
            JSON.stringify({ 
              success: true, 
              clientId: newClient.id,
              client_id: newClient.id,
              device_token: newClient.id,
              token,
              expires_in: 86400,
              uploaded_at: new Date().toISOString(),
              message: "Device auto-registered",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: "Client not found or inactive" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update last sync
      await supabase
        .from("mobile_clients")
        .update({ 
          last_sync_at: new Date().toISOString(),
          app_version: appVersion || client.app_version,
        })
        .eq("id", client.id);

      const token = generateToken({
        client_id: client.id,
        device_id: client.device_id,
        exp: Date.now() + 86400000,
      });

      console.log(`Authenticated client: ${client.id}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          clientId: client.id,
          client_id: client.id,
          device_token: client.id,
          token,
          expires_in: 86400,
          uploaded_at: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "deactivate") {
      // Deactivate a client
      const id = clientId || deviceId;
      
      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: "client_id or device_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try both client_id and device_id
      if (clientId) {
        await supabase
          .from("mobile_clients")
          .update({ is_active: false })
          .eq("id", clientId);
      }
      
      if (deviceId) {
        await supabase
          .from("mobile_clients")
          .update({ is_active: false })
          .eq("device_id", deviceId);
      }

      console.log(`Deactivated client: ${id}`);

      return new Response(
        JSON.stringify({ success: true, message: "Device deactivated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle status check
    if (action === "status") {
      const id = clientId || deviceId;
      
      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: "client_id or device_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let client;
      if (deviceId) {
        const { data } = await supabase
          .from("mobile_clients")
          .select("*")
          .eq("device_id", deviceId)
          .maybeSingle();
        client = data;
      } else if (clientId) {
        const { data } = await supabase
          .from("mobile_clients")
          .select("*")
          .eq("id", clientId)
          .maybeSingle();
        client = data;
      }

      if (!client) {
        return new Response(
          JSON.stringify({ success: false, registered: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          registered: true,
          clientId: client.id,
          isActive: client.is_active,
          lastSync: client.last_sync_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action. Use 'register', 'authenticate', 'deactivate', or 'status'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("auth-proxy error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
