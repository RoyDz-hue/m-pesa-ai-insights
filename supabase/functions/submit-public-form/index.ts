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
    const { 
      formId, 
      formData,
      mpesaCode, 
      beneficiaries,
      tipAmount 
    } = await req.json();

    // Validate required fields
    if (!formId || !mpesaCode) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Form ID and M-PESA code are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the form
    const { data: form, error: formError } = await supabaseAdmin
      .from('public_forms')
      .select('*')
      .eq('id', formId)
      .eq('status', 'published')
      .single();

    if (formError || !form) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Form not found or not published' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Re-validate M-PESA code (critical - don't trust client)
    const cleanCode = mpesaCode.toUpperCase().trim();
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('mpesa_transactions')
      .select('id, transaction_code, amount, used_for_form')
      .eq('transaction_code', cleanCode)
      .single();

    if (txError || !transaction) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Transaction code not found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: Check if already used (race condition protection)
    if (transaction.used_for_form) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'This transaction code has already been used' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amount = Number(transaction.amount) || 0;
    const chargePrice = Number(form.charge_price) || 0;

    if (amount < chargePrice) {
      return new Response(JSON.stringify({ 
        success: false,
        error: `Insufficient payment. Required: Ksh ${chargePrice}` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate beneficiaries count
    const rules = form.rules_json || {};
    const beneficiaryTiers = rules.beneficiary_tiers || [];
    let maxBeneficiaries = 0;

    for (const tier of beneficiaryTiers.sort((a: any, b: any) => b.min_amount - a.min_amount)) {
      if (amount >= tier.min_amount) {
        maxBeneficiaries = tier.max_beneficiaries;
        break;
      }
    }

    const submittedBeneficiaries = beneficiaries || [];
    if (submittedBeneficiaries.length > maxBeneficiaries) {
      return new Response(JSON.stringify({ 
        success: false,
        error: `Too many beneficiaries. Maximum allowed: ${maxBeneficiaries}` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use transaction to mark as used and create submission atomically
    // First mark the transaction as used
    const { data: markedTx, error: markError } = await supabaseAdmin
      .from('mpesa_transactions')
      .update({ used_for_form: formId })
      .eq('id', transaction.id)
      .is('used_for_form', null) // Only update if still null (race protection)
      .select()
      .single();

    if (markError || !markedTx) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Transaction code was just used. Please use a different code.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract name for display purposes (may or may not exist in formData)
    const submitterName = formData?.name || formData?.full_name || 'Submitter';

    // Create submission
    const { data: submission, error: submitError } = await supabaseAdmin
      .from('form_submissions')
      .insert({
        form_id: formId,
        mpesa_id: transaction.id,
        name: submitterName,
        admission_number: formData?.admission_number || formData?.admission || null,
        mpesa_code: cleanCode,
        amount_paid: amount,
        beneficiaries_json: submittedBeneficiaries,
        tip_amount: tipAmount || 0,
        form_data: formData || {},
      })
      .select()
      .single();

    if (submitError) {
      // Rollback the used_for_form mark
      await supabaseAdmin
        .from('mpesa_transactions')
        .update({ used_for_form: null })
        .eq('id', transaction.id);

      console.error('Submit error:', submitError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to submit form. Please try again.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // AI-generated confirmation message
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let confirmationMessage = `Thank you! Your submission for "${form.title}" has been received.`;

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { 
                role: 'system', 
                content: 'Generate a brief, friendly confirmation message (max 50 words) for a successful form submission. Be warm and professional.' 
              },
              { 
                role: 'user', 
                content: `Form: ${form.title}, Amount: Ksh ${amount}, Beneficiaries: ${submittedBeneficiaries.length}` 
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          confirmationMessage = aiData.choices?.[0]?.message?.content || confirmationMessage;
        }
      } catch (e) {
        console.error('AI confirmation generation failed:', e);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      submissionId: submission.id,
      message: confirmationMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('submit-public-form error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Submission failed. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
