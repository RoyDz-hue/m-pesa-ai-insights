import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionRecord {
  client_id: string;
  client_tx_id: string;
  transaction_code?: string;
  amount?: number;
  balance?: number;
  sender?: string;
  recipient?: string;
  transaction_type?: string;
  raw_message: string;
  transaction_timestamp: number;
}

interface CleanResult {
  success: boolean;
  inserted: string[];
  duplicates: string[];
  errors: { record: string; error: string }[];
  pending_review: string[];
  // For single transaction response (Android app compatibility)
  transaction?: {
    id: string;
    transaction_type: string;
    transaction_code: string | null;
    amount: number | null;
    balance: number | null;
    status: string;
    ai_metadata: object;
  };
  duplicate?: boolean;
  duplicate_of?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both single transaction and batch upload
    let records: TransactionRecord[];
    const isSingleTransaction = !body.records && body.raw_message;
    
    if (isSingleTransaction) {
      // Single transaction format from Android app
      records = [{
        client_id: body.client_id,
        client_tx_id: body.client_tx_id,
        raw_message: body.raw_message,
        transaction_timestamp: body.transaction_timestamp,
        transaction_code: body.transaction_code,
        amount: body.amount,
        balance: body.balance,
        sender: body.sender,
        recipient: body.recipient,
        transaction_type: body.transaction_type,
      }];
    } else {
      records = body.records;
    }
    
    if (!records || !Array.isArray(records)) {
      return new Response(
        JSON.stringify({ error: "Records array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${records.length} transactions`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const result: CleanResult = {
      success: true,
      inserted: [],
      duplicates: [],
      errors: [],
      pending_review: [],
    };

    for (const record of records) {
      try {
        // Check for existing transaction with same client_tx_id
        const { data: existing } = await supabase
          .from("mpesa_transactions")
          .select("id")
          .eq("client_tx_id", record.client_tx_id)
          .maybeSingle();

        if (existing) {
          console.log(`Duplicate found: ${record.client_tx_id}`);
          result.duplicates.push(record.client_tx_id);
          continue;
        }

        // Check for duplicate transaction codes
        if (record.transaction_code) {
          const { data: codeMatch } = await supabase
            .from("mpesa_transactions")
            .select("id")
            .eq("transaction_code", record.transaction_code)
            .maybeSingle();

          if (codeMatch) {
            console.log(`Duplicate transaction code: ${record.transaction_code}`);
            result.duplicates.push(record.client_tx_id);
            continue;
          }
        }

        // Call AI for parsing and classification
        let aiMetadata = {
          model: "google/gemini-2.5-flash",
          prompt_id: "mpesa_parse_v1",
          confidence: 0.5,
          explanation: "Fallback parsing",
          tags: [] as string[],
          flags: [] as string[],
        };

        if (lovableApiKey) {
          try {
            const startTime = Date.now();
            
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
                    content: `You are an M-PESA transaction parser. Analyze the raw message and return a JSON object with:
                    - confidence: float 0.0-1.0 indicating parsing confidence
                    - transaction_type: one of Paybill|Till|SendMoney|Withdrawal|Deposit|Airtime|BankToMpesa|MpesaToBank|Reversal|Unknown
                    - tags: array of relevant tags like ["income", "business", "personal"]
                    - flags: array of warning flags like ["high_amount", "unusual_time", "new_recipient"]
                    - explanation: brief reason for classification
                    Return ONLY valid JSON, no markdown.`
                  },
                  {
                    role: "user",
                    content: `Parse this M-PESA message:\n${record.raw_message}`
                  }
                ],
              }),
            });

            const processingTime = Date.now() - startTime;

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const content = aiData.choices?.[0]?.message?.content;
              
              if (content) {
                try {
                  const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
                  const parsed = JSON.parse(cleaned);
                  
                  aiMetadata = {
                    model: "google/gemini-2.5-flash",
                    prompt_id: "mpesa_parse_v1",
                    confidence: parsed.confidence || 0.5,
                    explanation: parsed.explanation || "AI parsed",
                    tags: parsed.tags || [],
                    flags: parsed.flags || [],
                  };

                  // Update transaction type if AI provides one
                  if (parsed.transaction_type && parsed.transaction_type !== "Unknown") {
                    record.transaction_type = parsed.transaction_type;
                  }

                  // Log AI processing
                  await supabase.from("ai_processing_logs").insert({
                    model: "google/gemini-2.5-flash",
                    prompt_id: "mpesa_parse_v1",
                    input_data: { raw_message: record.raw_message },
                    output_data: parsed,
                    processing_time_ms: processingTime,
                    success: true,
                  });
                } catch (parseError) {
                  console.error("AI response parse error:", parseError);
                }
              }
            }
          } catch (aiError) {
            console.error("AI processing error:", aiError);
          }
        }

        // Determine status based on confidence
        const status = aiMetadata.confidence < 0.85 ? "pending_review" : "cleaned";

        // Insert transaction
        const { data: inserted, error: insertError } = await supabase
          .from("mpesa_transactions")
          .insert({
            client_id: record.client_id,
            client_tx_id: record.client_tx_id,
            transaction_code: record.transaction_code,
            amount: record.amount,
            balance: record.balance,
            sender: record.sender,
            recipient: record.recipient,
            transaction_type: record.transaction_type,
            raw_message: record.raw_message,
            transaction_timestamp: record.transaction_timestamp,
            ai_metadata: aiMetadata,
            status,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        result.inserted.push(inserted.id);

        // Add to review queue if low confidence
        if (status === "pending_review") {
          await supabase.from("review_queue").insert({
            mpesa_id: inserted.id,
            reason: "low_confidence",
            priority: aiMetadata.confidence < 0.5 ? "high" : "normal",
            notes: aiMetadata.explanation,
          });
          result.pending_review.push(inserted.id);
        }

        // Check for fraud flags
        if (aiMetadata.flags.includes("high_amount") || aiMetadata.flags.includes("fraud_suspected")) {
          await supabase.from("review_queue").insert({
            mpesa_id: inserted.id,
            reason: "fraud_suspicion",
            priority: "critical",
            notes: `Flags: ${aiMetadata.flags.join(", ")}`,
          });
        }

        console.log(`Inserted: ${inserted.id} (status: ${status})`);

      } catch (error) {
        console.error(`Error processing record ${record.client_tx_id}:`, error);
        result.errors.push({
          record: record.client_tx_id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(`Results: ${result.inserted.length} inserted, ${result.duplicates.length} duplicates, ${result.errors.length} errors`);

    result.success = result.errors.length === 0 || result.inserted.length > 0;

    // For single transaction, return simplified response for Android app
    if (isSingleTransaction) {
      if (result.duplicates.length > 0) {
        return new Response(JSON.stringify({
          success: true,
          duplicate: true,
          duplicate_of: result.duplicates[0],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (result.inserted.length > 0) {
        // Fetch the inserted transaction to return full details
        const { data: txn } = await supabase
          .from("mpesa_transactions")
          .select("*")
          .eq("id", result.inserted[0])
          .single();
        
        return new Response(JSON.stringify({
          success: true,
          transaction: txn ? {
            id: txn.id,
            transaction_type: txn.transaction_type,
            transaction_code: txn.transaction_code,
            amount: txn.amount,
            balance: txn.balance,
            status: txn.status,
            ai_metadata: txn.ai_metadata,
            uploaded_at: txn.created_at, // Android app expects this field
          } : null,
          uploaded_at: txn?.created_at, // Also at top level for compatibility
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        error: result.errors[0]?.error || "Unknown error",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("clean-mpesa error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
