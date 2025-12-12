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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get transactions from last 24 hours
    const oneDayAgo = Date.now() - 86400000;
    
    const { data: recentTx, error: fetchError } = await supabase
      .from("mpesa_transactions")
      .select("*")
      .gte("transaction_timestamp", oneDayAgo)
      .order("transaction_timestamp", { ascending: false })
      .limit(100);

    if (fetchError) throw fetchError;

    console.log(`Analyzing ${recentTx?.length || 0} recent transactions for fraud`);

    if (!recentTx || recentTx.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recent transactions to analyze", flagged: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anomalies: { transaction_id: string; severity: string; explanation: string }[] = [];

    // Rule-based fraud detection
    for (const tx of recentTx) {
      const flags: string[] = [];
      let severity = "normal";

      // High amount detection (> 100,000 KES)
      if (tx.amount && tx.amount > 100000) {
        flags.push("high_amount");
        severity = "high";
      }

      // Rapid successive transactions (more than 5 in an hour from same client)
      const sameClientTx = recentTx.filter(
        (t) =>
          t.client_id === tx.client_id &&
          Math.abs(t.transaction_timestamp - tx.transaction_timestamp) < 3600000
      );
      if (sameClientTx.length > 5) {
        flags.push("rapid_transactions");
        severity = "high";
      }

      // Large withdrawal after deposit
      if (tx.transaction_type === "Withdrawal" && tx.amount && tx.amount > 50000) {
        const recentDeposit = recentTx.find(
          (t) =>
            t.client_id === tx.client_id &&
            t.transaction_type === "Deposit" &&
            t.transaction_timestamp < tx.transaction_timestamp &&
            tx.transaction_timestamp - t.transaction_timestamp < 1800000 // 30 mins
        );
        if (recentDeposit) {
          flags.push("quick_deposit_withdrawal");
          severity = "critical";
        }
      }

      // Unusual time (between 1 AM and 5 AM)
      const txDate = new Date(tx.transaction_timestamp);
      const hour = txDate.getHours();
      if (hour >= 1 && hour <= 5) {
        flags.push("unusual_time");
      }

      if (flags.length > 0) {
        anomalies.push({
          transaction_id: tx.id,
          severity,
          explanation: `Detected: ${flags.join(", ")}`,
        });
      }
    }

    // AI-powered anomaly detection if available
    if (lovableApiKey && recentTx.length > 0) {
      try {
        const txSummary = recentTx.slice(0, 20).map((tx) => ({
          id: tx.id,
          type: tx.transaction_type,
          amount: tx.amount,
          timestamp: tx.transaction_timestamp,
          sender: tx.sender,
          recipient: tx.recipient,
        }));

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are a fraud detection AI for M-PESA transactions. Analyze the transaction patterns and identify any suspicious activity. Return a JSON array of anomalies with format:
                [{ "transaction_id": "uuid", "severity": "low|normal|high|critical", "explanation": "reason" }]
                Return ONLY valid JSON array, no markdown.`,
              },
              {
                role: "user",
                content: `Analyze these transactions for fraud:\n${JSON.stringify(txSummary, null, 2)}`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          
          if (content) {
            try {
              const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
              const aiAnomalies = JSON.parse(cleaned);
              
              if (Array.isArray(aiAnomalies)) {
                for (const anomaly of aiAnomalies) {
                  // Avoid duplicates
                  if (!anomalies.find((a) => a.transaction_id === anomaly.transaction_id)) {
                    anomalies.push(anomaly);
                  }
                }
              }
            } catch (parseError) {
              console.error("AI response parse error:", parseError);
            }
          }
        }
      } catch (aiError) {
        console.error("AI fraud detection error:", aiError);
      }
    }

    // Flag suspicious transactions
    for (const anomaly of anomalies) {
      // Check if already in review queue
      const { data: existingReview } = await supabase
        .from("review_queue")
        .select("id")
        .eq("mpesa_id", anomaly.transaction_id)
        .eq("reason", "fraud_suspicion")
        .maybeSingle();

      if (!existingReview) {
        await supabase.from("review_queue").insert({
          mpesa_id: anomaly.transaction_id,
          reason: "fraud_suspicion",
          priority: anomaly.severity as any,
          notes: anomaly.explanation,
        });

        // Update transaction ai_metadata with fraud flag
        const { data: tx } = await supabase
          .from("mpesa_transactions")
          .select("ai_metadata")
          .eq("id", anomaly.transaction_id)
          .single();

        if (tx) {
          const currentMetadata = tx.ai_metadata as Record<string, any> || {};
          const currentFlags = (currentMetadata.flags as string[]) || [];
          
          if (!currentFlags.includes("fraud_suspected")) {
            await supabase
              .from("mpesa_transactions")
              .update({
                ai_metadata: {
                  ...currentMetadata,
                  flags: [...currentFlags, "fraud_suspected"],
                },
              })
              .eq("id", anomaly.transaction_id);
          }
        }
      }
    }

    console.log(`Flagged ${anomalies.length} suspicious transactions`);

    return new Response(
      JSON.stringify({ 
        message: "Fraud detection complete",
        flagged: anomalies.length,
        anomalies,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("detect-fraud error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
