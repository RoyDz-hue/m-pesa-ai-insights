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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, formId } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an AI that derives payment confirmation form schemas STRICTLY from admin text.

HARD RULES (NON-NEGOTIABLE):
1. Do NOT assume ANY field unless EXPLICITLY mentioned in admin text
2. Do NOT auto-add: admission number, email, phone, ID number, name - unless explicitly stated
3. The ONLY mandatory system field is "mpesa_code" - always required, always validated
4. All other fields must be DERIVED STRICTLY from the admin's language intent

FIELD TYPE RULES:
- Text / short answer → type: "text"
- Number → type: "number"
- Email → type: "email" (validate format)
- Phone → type: "phone" (numeric, starts with 0)
- Date → type: "date" (calendar input)

INTERPRETATION LOGIC:
- "include his name" / "your name" → add name field
- "admission number" → add admission field
- "pay for anyone" / "beneficiaries" → enable beneficiary logic
- "Ksh X" / "cost is X" / "sh.X" → charge_price = X
- Vague concepts → make field OPTIONAL, never required

BENEFICIARY LOGIC (only if mentioned):
- Extract tier amounts from text like "Ksh 50 = 1 beneficiary"
- If "pay for anyone" mentioned without tiers, calculate: extra_amount / charge_price = max_beneficiaries
- beneficiary_fields should ONLY contain fields explicitly mentioned for beneficiaries

Return ONLY valid JSON with this structure:
{
  "title": "Derived form title",
  "description": "Brief description from context",
  "charge_price": <number>,
  "schema_json": [
    {"name": "mpesa_code", "type": "text", "label": "M-PESA Transaction Code", "required": true}
    // Add ONLY fields explicitly mentioned in admin text
  ],
  "rules_json": {
    "beneficiary_tiers": [], // Empty if not mentioned
    "allow_tip": false, // true only if tip/excess mentioned
    "beneficiary_fields": [] // ONLY fields mentioned for beneficiaries
  }
}

EXAMPLE INPUT: "Create NITA form payment form, you will only come to collect if you paid the sh.10 cost, you can as well pay for anyone and include his name"

EXAMPLE OUTPUT:
{
  "title": "NITA Payment Confirmation",
  "description": "Payment confirmation for NITA form collection",
  "charge_price": 10,
  "schema_json": [
    {"name": "mpesa_code", "type": "text", "label": "M-PESA Transaction Code", "required": true}
  ],
  "rules_json": {
    "beneficiary_tiers": [],
    "allow_tip": false,
    "beneficiary_fields": [
      {"name": "beneficiary_name", "type": "text", "label": "Beneficiary Name", "required": true}
    ]
  }
}

Always return valid JSON only, no markdown or explanations.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error('AI processing failed');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No AI response received');
    }

    // Parse AI response
    let formSchema;
    try {
      // Clean up potential markdown formatting
      const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      formSchema = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse form schema from AI');
    }

    // If formId is provided, update existing form
    if (formId) {
      const { data: updatedForm, error: updateError } = await supabaseClient
        .from('public_forms')
        .update({
          title: formSchema.title,
          description: formSchema.description,
          charge_price: formSchema.charge_price,
          schema_json: formSchema.schema_json,
          rules_json: formSchema.rules_json,
        })
        .eq('id', formId)
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error('Failed to update form');
      }

      return new Response(JSON.stringify({ 
        form: updatedForm,
        message: 'Form updated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create new form as draft
    const { data: newForm, error: insertError } = await supabaseClient
      .from('public_forms')
      .insert({
        user_id: user.id,
        title: formSchema.title,
        description: formSchema.description,
        charge_price: formSchema.charge_price,
        schema_json: formSchema.schema_json,
        rules_json: formSchema.rules_json,
        status: 'draft',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to create form');
    }

    return new Response(JSON.stringify({ 
      form: newForm,
      message: 'Form created as draft. Review and publish when ready.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ai-form-builder error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
