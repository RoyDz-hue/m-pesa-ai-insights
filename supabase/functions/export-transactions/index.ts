import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { format = "csv", filters = {} } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query with filters
    let query = supabase
      .from("mpesa_transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.transaction_type) {
      query = query.eq("transaction_type", filters.transaction_type);
    }
    if (filters.from_date) {
      query = query.gte("created_at", filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte("created_at", filters.to_date);
    }
    if (filters.min_amount) {
      query = query.gte("amount", filters.min_amount);
    }
    if (filters.max_amount) {
      query = query.lte("amount", filters.max_amount);
    }

    const { data: transactions, error } = await query.limit(10000);

    if (error) throw error;

    console.log(`Exporting ${transactions?.length || 0} transactions as ${format}`);

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No transactions found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "ID",
        "Transaction Code",
        "Type",
        "Amount",
        "Balance",
        "Sender",
        "Recipient",
        "Status",
        "Date",
        "Raw Message",
      ];

      const rows = transactions.map((tx) => [
        tx.id,
        tx.transaction_code || "",
        tx.transaction_type,
        tx.amount || "",
        tx.balance || "",
        tx.sender || "",
        tx.recipient || "",
        tx.status,
        new Date(tx.created_at).toISOString(),
        `"${(tx.raw_message || "").replace(/"/g, '""')}"`,
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new Response(csv, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="mpesa_transactions_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (format === "json") {
      return new Response(JSON.stringify(transactions, null, 2), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="mpesa_transactions_${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }

    // Excel-compatible format (CSV with BOM for Excel)
    if (format === "excel") {
      const headers = [
        "ID",
        "Transaction Code",
        "Type",
        "Amount",
        "Balance",
        "Sender",
        "Recipient",
        "Status",
        "Date",
      ];

      const rows = transactions.map((tx) => [
        tx.id,
        tx.transaction_code || "",
        tx.transaction_type,
        tx.amount || "",
        tx.balance || "",
        tx.sender || "",
        tx.recipient || "",
        tx.status,
        new Date(tx.created_at).toLocaleString(),
      ]);

      // Add BOM for Excel compatibility
      const bom = "\uFEFF";
      const csv = bom + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new Response(csv, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="mpesa_transactions_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid format. Use 'csv', 'json', or 'excel'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("export-transactions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
