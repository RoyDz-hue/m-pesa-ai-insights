import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
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
  processed?: number;
  transactions?: object[];
  // For single transaction response (Android app compatibility)
  transaction?: {
    id: string;
    transaction_type: string;
    transaction_code: string | null;
    amount: number | null;
    balance: number | null;
    status: string;
    ai_metadata: object;
    uploaded_at?: string;
    timestamp?: number;
    recipient?: string;
    phone?: string;
    parsed_at?: number;
  };
  duplicate?: boolean;
  duplicate_of?: string;
  message?: string;
  uploaded_at?: string;
}

serve(async (req) => {
  // Handle CORS preflight
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
      // Verify token exists in mobile_clients
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
    
    // Support both single transaction and batch upload
    let records: TransactionRecord[];
    const isSingleTransaction = !body.records && body.raw_message;
    
    // Extract client_id from body or use device token
    const clientId = body.client_id || deviceToken;
    
    if (isSingleTransaction) {
      // Single transaction format from Android app
      records = [{
        client_id: clientId,
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
      // Batch upload - add client_id to each record if not present
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

    const result: CleanResult = {
      success: true,
      inserted: [],
      duplicates: [],
      errors: [],
      pending_review: [],
      transactions: [],
    };

    for (const record of records) {
      try {
        // Check for existing transaction with same client_tx_id
        const { data: existingByTxId } = await supabase
          .from("mpesa_transactions")
          .select("*")
          .eq("client_tx_id", record.client_tx_id)
          .maybeSingle();

        if (existingByTxId) {
          console.log(`Duplicate by client_tx_id: ${record.client_tx_id}`);
          result.duplicates.push(record.client_tx_id);
          
          // For single transaction, return 409 with existing data
          if (isSingleTransaction) {
            return new Response(JSON.stringify({
              success: true,
              message: "Transaction already exists",
              duplicate: true,
              duplicate_of: existingByTxId.id,
              transaction: {
                id: existingByTxId.id,
                transaction_type: existingByTxId.transaction_type,
                transaction_code: existingByTxId.transaction_code,
                amount: existingByTxId.amount,
                balance: existingByTxId.balance,
                status: existingByTxId.status,
                ai_metadata: existingByTxId.ai_metadata,
                recipient: existingByTxId.recipient,
                timestamp: existingByTxId.transaction_timestamp,
                uploaded_at: existingByTxId.created_at,
                parsed_at: Math.floor(new Date(existingByTxId.created_at).getTime() / 1000),
              },
            }), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          continue;
        }

        // Check for duplicate by raw_message + client_id
        const { data: existingByRaw } = await supabase
          .from("mpesa_transactions")
          .select("*")
          .eq("client_id", record.client_id)
          .eq("raw_message", record.raw_message)
          .maybeSingle();

        if (existingByRaw) {
          console.log(`Duplicate by raw_message: ${record.client_tx_id}`);
          result.duplicates.push(record.client_tx_id);
          
          if (isSingleTransaction) {
            return new Response(JSON.stringify({
              success: true,
              message: "Transaction already exists",
              duplicate: true,
              duplicate_of: existingByRaw.id,
              transaction: {
                id: existingByRaw.id,
                transaction_type: existingByRaw.transaction_type,
                transaction_code: existingByRaw.transaction_code,
                amount: existingByRaw.amount,
                balance: existingByRaw.balance,
                status: existingByRaw.status,
                ai_metadata: existingByRaw.ai_metadata,
                recipient: existingByRaw.recipient,
                timestamp: existingByRaw.transaction_timestamp,
                uploaded_at: existingByRaw.created_at,
                parsed_at: Math.floor(new Date(existingByRaw.created_at).getTime() / 1000),
              },
            }), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          continue;
        }

        // Check for duplicate transaction codes
        if (record.transaction_code) {
          const { data: codeMatch } = await supabase
            .from("mpesa_transactions")
            .select("*")
            .eq("transaction_code", record.transaction_code)
            .maybeSingle();

          if (codeMatch) {
            console.log(`Duplicate transaction code: ${record.transaction_code}`);
            result.duplicates.push(record.client_tx_id);
            
            if (isSingleTransaction) {
              return new Response(JSON.stringify({
                success: true,
                message: "Transaction already exists",
                duplicate: true,
                duplicate_of: codeMatch.id,
                transaction: {
                  id: codeMatch.id,
                  transaction_type: codeMatch.transaction_type,
                  transaction_code: codeMatch.transaction_code,
                  amount: codeMatch.amount,
                  balance: codeMatch.balance,
                  status: codeMatch.status,
                  ai_metadata: codeMatch.ai_metadata,
                  recipient: codeMatch.recipient,
                  timestamp: codeMatch.transaction_timestamp,
                  uploaded_at: codeMatch.created_at,
                  parsed_at: Math.floor(new Date(codeMatch.created_at).getTime() / 1000),
                },
              }), {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
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
          .select("*")
          .single();

        if (insertError) throw insertError;

        result.inserted.push(inserted.id);
        result.transactions?.push({
          id: inserted.id,
          transaction_type: inserted.transaction_type,
          transaction_code: inserted.transaction_code,
          amount: inserted.amount,
          balance: inserted.balance,
          recipient: inserted.recipient,
          timestamp: inserted.transaction_timestamp,
          uploaded_at: inserted.created_at,
          parsed_at: Math.floor(new Date(inserted.created_at).getTime() / 1000),
        });

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

    // Update last_sync_at for the client
    if (clientId) {
      await supabase
        .from("mobile_clients")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", clientId);
      console.log(`Updated last_sync_at for client: ${clientId}`);
    }

    console.log(`Results: ${result.inserted.length} inserted, ${result.duplicates.length} duplicates, ${result.errors.length} errors`);

    result.success = result.errors.length === 0 || result.inserted.length > 0;

    // For single transaction, return simplified response for Android app
    if (isSingleTransaction) {
      if (result.inserted.length > 0) {
        // Fetch the inserted transaction to return full details
        const { data: txn } = await supabase
          .from("mpesa_transactions")
          .select("*")
          .eq("id", result.inserted[0])
          .single();
        
        const now = new Date().toISOString();
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
            recipient: txn.recipient,
            phone: txn.recipient, // Android may expect phone field
            timestamp: txn.transaction_timestamp,
            uploaded_at: txn.created_at,
            parsed_at: Math.floor(new Date(txn.created_at).getTime() / 1000),
          } : null,
          uploaded_at: now,
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
    result.processed = records.length;
    
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
