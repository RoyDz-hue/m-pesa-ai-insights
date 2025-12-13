import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
};

interface TransactionRecord {
  client_id: string;
  client_tx_id: string;
  raw_message: string;
  transaction_timestamp: number;
}

interface ParsedTransaction {
  transaction_code: string | null;
  amount: number | null;
  balance: number | null;
  sender_name: string | null;
  recipient_name: string | null;
  transaction_type: string;
  date: string | null;
  time: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate x-device-token header
    const deviceToken = req.headers.get("x-device-token");
    
    if (deviceToken) {
      const { data: client, error: tokenError } = await supabase
        .from("mobile_clients")
        .select("id, is_active")
        .eq("id", deviceToken)
        .maybeSingle();

      if (tokenError || !client) {
        console.log(`Invalid device token: ${deviceToken}`);
        return new Response(
          JSON.stringify({ success: false, error: "Invalid device token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!client.is_active) {
        console.log(`Inactive device token: ${deviceToken}`);
        return new Response(
          JSON.stringify({ success: false, error: "Device is deactivated" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body = await req.json();
    
    let records: TransactionRecord[];
    const isSingleTransaction = !body.records && body.raw_message;
    const clientId = body.client_id || deviceToken;
    
    if (isSingleTransaction) {
      records = [{
        client_id: clientId,
        client_tx_id: body.client_tx_id,
        raw_message: body.raw_message,
        transaction_timestamp: body.transaction_timestamp,
      }];
    } else {
      records = (body.records || []).map((r: TransactionRecord) => ({
        ...r,
        client_id: r.client_id || clientId,
      }));
    }
    
    if (!records || !Array.isArray(records) || records.length === 0) {
      return new Response(
        JSON.stringify({ error: "Records array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${records.length} transactions from client: ${clientId}`);

    const result = {
      success: true,
      inserted: [] as string[],
      duplicates: [] as string[],
      errors: [] as { record: string; error: string }[],
      transactions: [] as object[],
      processed: 0,
    };

    for (const record of records) {
      try {
        // Step 1: Parse with AI to extract transaction_code FIRST
        let parsed: ParsedTransaction = {
          transaction_code: null,
          amount: null,
          balance: null,
          sender_name: null,
          recipient_name: null,
          transaction_type: "Unknown",
          date: null,
          time: null,
        };

        let aiMetadata = {
          model: "google/gemini-2.5-flash",
          prompt_id: "mpesa_parse_v2",
          confidence: 0.5,
          explanation: "Fallback parsing",
          tags: [] as string[],
          flags: [] as string[],
        };

        let confidenceScore = 0.5;

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
                    content: `You are an M-PESA SMS parser. Extract structured data from M-PESA transaction messages.

CRITICAL: Extract the transaction code EXACTLY as it appears (e.g., "SML1234567", "TGH6789012"). This is the unique identifier.

Return a JSON object with these fields:
{
  "transaction_code": "exact code from SMS like SML1234567",
  "amount": numeric value without currency symbols,
  "balance": numeric value of new balance,
  "sender_name": "name or number of sender",
  "recipient_name": "name or number of recipient",
  "transaction_type": "Paybill|Till|SendMoney|Withdrawal|Deposit|Airtime|BankToMpesa|MpesaToBank|Reversal|Unknown",
  "date": "YYYY-MM-DD format",
  "time": "HH:MM:SS format",
  "confidence": 0.0-1.0 parsing confidence,
  "tags": ["income", "expense", "business", "personal", etc],
  "flags": ["high_amount", "unusual_time", "new_recipient", etc],
  "explanation": "brief parsing explanation"
}

Return ONLY valid JSON, no markdown or extra text.`
                  },
                  {
                    role: "user",
                    content: record.raw_message
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
                  const aiParsed = JSON.parse(cleaned);
                  
                  parsed = {
                    transaction_code: aiParsed.transaction_code || null,
                    amount: typeof aiParsed.amount === 'number' ? aiParsed.amount : parseFloat(aiParsed.amount) || null,
                    balance: typeof aiParsed.balance === 'number' ? aiParsed.balance : parseFloat(aiParsed.balance) || null,
                    sender_name: aiParsed.sender_name || aiParsed.sender || null,
                    recipient_name: aiParsed.recipient_name || aiParsed.recipient || null,
                    transaction_type: aiParsed.transaction_type || "Unknown",
                    date: aiParsed.date || null,
                    time: aiParsed.time || null,
                  };

                  confidenceScore = aiParsed.confidence || 0.9;

                  aiMetadata = {
                    model: "google/gemini-2.5-flash",
                    prompt_id: "mpesa_parse_v2",
                    confidence: confidenceScore,
                    explanation: aiParsed.explanation || "AI parsed successfully",
                    tags: aiParsed.tags || [],
                    flags: aiParsed.flags || [],
                  };

                  // Log AI processing
                  await supabase.from("ai_processing_logs").insert({
                    model: "google/gemini-2.5-flash",
                    prompt_id: "mpesa_parse_v2",
                    input_data: { raw_message: record.raw_message },
                    output_data: aiParsed,
                    processing_time_ms: processingTime,
                    success: true,
                  });

                  console.log(`AI parsed: code=${parsed.transaction_code}, type=${parsed.transaction_type}, amount=${parsed.amount}`);
                } catch (parseError) {
                  console.error("AI response parse error:", parseError);
                }
              }
            } else {
              console.error("AI API error:", await aiResponse.text());
            }
          } catch (aiError) {
            console.error("AI processing error:", aiError);
          }
        }

        // Step 2: Check for duplicate by TRANSACTION_CODE (primary deduplication)
        if (parsed.transaction_code) {
          const { data: existingByCode } = await supabase
            .from("mpesa_transactions")
            .select("id, transaction_code, amount, transaction_type, status, ai_metadata, created_at, transaction_timestamp, recipient_name")
            .eq("transaction_code", parsed.transaction_code)
            .maybeSingle();

          if (existingByCode) {
            console.log(`Duplicate by transaction_code: ${parsed.transaction_code}`);
            result.duplicates.push(record.client_tx_id);
            
            if (isSingleTransaction) {
              return new Response(JSON.stringify({
                success: true,
                message: "Transaction already exists",
                duplicate: true,
                duplicate_of: existingByCode.id,
                transaction: {
                  id: existingByCode.id,
                  transaction_code: existingByCode.transaction_code,
                  transaction_type: existingByCode.transaction_type,
                  amount: existingByCode.amount,
                  status: existingByCode.status,
                  recipient_name: existingByCode.recipient_name,
                  timestamp: existingByCode.transaction_timestamp,
                  uploaded_at: existingByCode.created_at,
                },
              }), {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            continue;
          }
        }

        // Step 3: Secondary check by client_tx_id
        const { data: existingByTxId } = await supabase
          .from("mpesa_transactions")
          .select("id")
          .eq("client_tx_id", record.client_tx_id)
          .maybeSingle();

        if (existingByTxId) {
          console.log(`Duplicate by client_tx_id: ${record.client_tx_id}`);
          result.duplicates.push(record.client_tx_id);
          if (isSingleTransaction) {
            return new Response(JSON.stringify({
              success: true,
              message: "Transaction already exists",
              duplicate: true,
              duplicate_of: existingByTxId.id,
            }), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          continue;
        }

        // Step 4: Insert FULLY PROCESSED transaction - NO MANUAL APPROVAL
        // All transactions go directly to 'cleaned' status
        // Only fraud-flagged transactions go to review queue

        const { data: inserted, error: insertError } = await supabase
          .from("mpesa_transactions")
          .insert({
            client_id: record.client_id,
            client_tx_id: record.client_tx_id,
            transaction_code: parsed.transaction_code,
            amount: parsed.amount,
            balance: parsed.balance,
            sender_name: parsed.sender_name,
            recipient_name: parsed.recipient_name,
            transaction_type: parsed.transaction_type,
            raw_message: record.raw_message,
            transaction_timestamp: record.transaction_timestamp,
            ai_metadata: aiMetadata,
            confidence_score: confidenceScore,
            transaction_date: parsed.date,
            transaction_time: parsed.time,
            parsed_data: {
              date: parsed.date,
              time: parsed.time,
            },
            status: "cleaned", // Always cleaned - AI is trusted
          })
          .select("*")
          .single();

        if (insertError) throw insertError;

        result.inserted.push(inserted.id);
        result.transactions.push({
          id: inserted.id,
          transaction_code: inserted.transaction_code,
          transaction_type: inserted.transaction_type,
          amount: inserted.amount,
          balance: inserted.balance,
          recipient_name: inserted.recipient_name,
          sender_name: inserted.sender_name,
          status: inserted.status,
          confidence_score: confidenceScore,
          timestamp: inserted.transaction_timestamp,
          uploaded_at: inserted.created_at,
        });

        // Only add to review queue for FRAUD suspicion (not low confidence)
        if (aiMetadata.flags.some(f => ["fraud_suspected", "unusual_pattern"].includes(f))) {
          await supabase.from("review_queue").insert({
            mpesa_id: inserted.id,
            reason: "fraud_suspicion",
            priority: "critical",
            fraud_type: "ai_detected",
            ai_explanation: aiMetadata.explanation,
            notes: `Fraud flags: ${aiMetadata.flags.join(", ")}`,
          });
        }

        console.log(`Inserted: ${inserted.id} | Code: ${inserted.transaction_code} | Type: ${inserted.transaction_type} | Amount: ${inserted.amount}`);

      } catch (error) {
        console.error(`Error processing record ${record.client_tx_id}:`, error);
        result.errors.push({
          record: record.client_tx_id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update last_sync_at for the client
    if (clientId) {
      await supabase
        .from("mobile_clients")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", clientId);
    }

    console.log(`Results: ${result.inserted.length} inserted, ${result.duplicates.length} duplicates, ${result.errors.length} errors`);

    result.success = result.errors.length === 0 || result.inserted.length > 0;
    result.processed = records.length;

    // For single transaction, return simplified response
    if (isSingleTransaction) {
      if (result.inserted.length > 0 && result.transactions[0]) {
        return new Response(JSON.stringify({
          success: true,
          transaction: result.transactions[0],
          uploaded_at: new Date().toISOString(),
        }), {
          status: 201,
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

    // Batch response
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
