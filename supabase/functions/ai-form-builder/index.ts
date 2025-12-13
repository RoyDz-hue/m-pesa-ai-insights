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

    const systemPrompt = `You are an AI that creates payment confirmation form schemas. 
Given a user's description, extract:
1. Form title
2. Base charge price (in Ksh)
3. Form fields (always include: name, admission_number, mpesa_code - these are mandatory)
4. Additional custom fields if mentioned
5. Beneficiary rules (if applicable)
6. Tip rules (if applicable)

Return a JSON object with this exact structure:
{
  "title": "Form Title",
  "description": "Brief description",
  "charge_price": 20,
  "schema_json": [
    {"name": "name", "type": "text", "label": "Full Name", "required": true},
    {"name": "admission_number", "type": "text", "label": "Admission Number", "required": true},
    {"name": "mpesa_code", "type": "text", "label": "M-PESA Transaction Code", "required": true}
  ],
  "rules_json": {
    "beneficiary_tiers": [
      {"min_amount": 50, "max_beneficiaries": 1},
      {"min_amount": 60, "max_beneficiaries": 2},
      {"min_amount": 100, "max_beneficiaries": 4}
    ],
    "allow_tip": true,
    "beneficiary_fields": [
      {"name": "beneficiary_name", "type": "text", "label": "Beneficiary Name", "required": true},
      {"name": "beneficiary_admission", "type": "text", "label": "Beneficiary Admission Number", "required": true}
    ]
  }
}

If no beneficiaries are mentioned, set beneficiary_tiers to empty array.
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
