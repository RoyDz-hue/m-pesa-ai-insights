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
    const { action, client_id, device_id, device_signature, device_info } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "register") {
      // Register a new mobile client
      if (!device_id) {
        return new Response(
          JSON.stringify({ error: "device_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if device already exists
      const { data: existingClient } = await supabase
        .from("mobile_clients")
        .select("*")
        .eq("device_id", device_id)
        .maybeSingle();

      if (existingClient) {
        // Update existing client
        await supabase
          .from("mobile_clients")
          .update({
            device_name: device_info?.device_name,
            device_model: device_info?.device_model,
            os_version: device_info?.os_version,
            app_version: device_info?.app_version,
            last_sync_at: new Date().toISOString(),
            is_active: true,
          })
          .eq("device_id", device_id);

        const token = generateToken({
          client_id: existingClient.id,
          device_id,
          exp: Date.now() + 3600000, // 1 hour
        });

        console.log(`Updated existing client: ${device_id}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            client_id: existingClient.id,
            token,
            expires_in: 3600,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new client
      const { data: newClient, error: insertError } = await supabase
        .from("mobile_clients")
        .insert({
          device_id,
          device_name: device_info?.device_name,
          device_model: device_info?.device_model,
          os_version: device_info?.os_version,
          app_version: device_info?.app_version,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const token = generateToken({
        client_id: newClient.id,
        device_id,
        exp: Date.now() + 3600000,
      });

      console.log(`Registered new client: ${device_id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          client_id: newClient.id,
          token,
          expires_in: 3600,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "authenticate") {
      // Authenticate existing client
      if (!client_id || !device_signature) {
        return new Response(
          JSON.stringify({ error: "client_id and device_signature are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify device signature
      if (!verifyDeviceSignature(client_id, device_signature)) {
        return new Response(
          JSON.stringify({ error: "Invalid device signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get client info
      const { data: client } = await supabase
        .from("mobile_clients")
        .select("*")
        .eq("id", client_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!client) {
        return new Response(
          JSON.stringify({ error: "Client not found or inactive" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update last sync
      await supabase
        .from("mobile_clients")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", client_id);

      const token = generateToken({
        client_id,
        device_id: client.device_id,
        exp: Date.now() + 3600000,
      });

      console.log(`Authenticated client: ${client_id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          token,
          expires_in: 3600,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "deactivate") {
      // Deactivate a client
      if (!client_id) {
        return new Response(
          JSON.stringify({ error: "client_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("mobile_clients")
        .update({ is_active: false })
        .eq("id", client_id);

      console.log(`Deactivated client: ${client_id}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'register', 'authenticate', or 'deactivate'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("auth-proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
