import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mpesaCode, formId } = await req.json();

    if (!mpesaCode || !formId) {
      return new Response(JSON.stringify({ 
        valid: false,
        error: 'M-PESA code and form ID are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for this public endpoint
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the form to check charge price and rules
    const { data: form, error: formError } = await supabaseAdmin
      .from('public_forms')
      .select('*')
      .eq('id', formId)
      .eq('status', 'published')
      .single();

    if (formError || !form) {
      return new Response(JSON.stringify({ 
        valid: false,
        error: 'Form not found or not published' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the transaction by code
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('mpesa_transactions')
      .select('id, transaction_code, amount, used_for_form')
      .eq('transaction_code', mpesaCode.toUpperCase().trim())
      .single();

    if (txError || !transaction) {
      return new Response(JSON.stringify({ 
        valid: false,
        error: 'Transaction code not found. Please verify your M-PESA code.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already used
    if (transaction.used_for_form) {
      return new Response(JSON.stringify({ 
        valid: false,
        error: 'This transaction code has already been used for a submission.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amount = Number(transaction.amount) || 0;
    const chargePrice = Number(form.charge_price) || 0;

    // Check if amount is sufficient
    if (amount < chargePrice) {
      return new Response(JSON.stringify({ 
        valid: false,
        error: `Insufficient amount. Required: Ksh ${chargePrice}, Paid: Ksh ${amount}` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate beneficiaries allowed
    const rules = form.rules_json || {};
    const beneficiaryTiers = rules.beneficiary_tiers || [];
    let maxBeneficiaries = 0;

    // Find applicable tier
    for (const tier of beneficiaryTiers.sort((a: any, b: any) => b.min_amount - a.min_amount)) {
      if (amount >= tier.min_amount) {
        maxBeneficiaries = tier.max_beneficiaries;
        break;
      }
    }

    const excessAmount = amount - chargePrice;
    const allowTip = rules.allow_tip === true;

    return new Response(JSON.stringify({ 
      valid: true,
      transactionId: transaction.id,
      amount,
      chargePrice,
      excessAmount,
      maxBeneficiaries,
      allowTip,
      beneficiaryFields: rules.beneficiary_fields || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('validate-mpesa-code error:', error);
    return new Response(JSON.stringify({ 
      valid: false,
      error: 'Validation failed. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
