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
    const { message, conversationHistory = [] } = await req.json();
    
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recent transactions for context
    const { data: transactions } = await supabase
      .from("mpesa_transactions")
      .select("transaction_code, amount, transaction_type, sender, recipient, status, transaction_timestamp")
      .order("transaction_timestamp", { ascending: false })
      .limit(50);

    // Fetch stats
    const { data: allTx } = await supabase
      .from("mpesa_transactions")
      .select("amount, transaction_type, status");

    const stats = {
      total: allTx?.length || 0,
      totalAmount: allTx?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    allTx?.forEach(tx => {
      stats.byType[tx.transaction_type] = (stats.byType[tx.transaction_type] || 0) + 1;
      stats.byStatus[tx.status || 'unknown'] = (stats.byStatus[tx.status || 'unknown'] || 0) + 1;
    });

    const systemPrompt = `You are an AI assistant for MTran, an M-PESA transaction monitoring system. You help users understand their transaction data, find specific transactions, and provide insights.

CURRENT DATA CONTEXT:
- Total Transactions: ${stats.total}
- Total Amount: Ksh ${stats.totalAmount.toLocaleString()}
- By Type: ${JSON.stringify(stats.byType)}
- By Status: ${JSON.stringify(stats.byStatus)}

RECENT TRANSACTIONS (last 50):
${JSON.stringify(transactions?.slice(0, 20) || [], null, 2)}

CAPABILITIES:
1. Answer questions about transactions (amount, sender, recipient, type)
2. Search for specific transactions by code, name, or amount
3. Provide spending insights and patterns
4. Explain transaction statuses and types
5. Help with data analysis

When users ask about specific transactions, search the data above. If you can't find something, say so clearly.
Format amounts as "Ksh X,XXX" and dates in a readable format.
Be concise but helpful.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message }
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please add more credits." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI service unavailable");
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ 
      reply,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("ai-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
