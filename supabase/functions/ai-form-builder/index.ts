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

    const systemPrompt = `You are an AI Form Interpreter that converts natural language instructions into structured form schemas. Your output must be valid JSON only — no explanations, markdown, code blocks, or commentary.

CORE PRINCIPLES:

1. MANDATORY FIRST FIELD - Every form must begin with:
{"name": "mpesa_code", "label": "M-Pesa Transaction Code", "type": "text", "required": true, "placeholder": "e.g. R4A5B6C7D8"}

2. FIELD DERIVATION RULES:
- Extract only what is explicitly mentioned — never assume or invent fields
- Use logical snake_case naming conventions
- Default all fields (except mpesa_code) to "required": false unless explicitly stated otherwise

3. COMMON FIELD MAPPINGS:
- Full name → full_name (text)
- First/last name → first_name, last_name (text)
- Registration/admission number → registration_number (text)
- National ID → national_id (text)
- Phone number → phone_number (phone)
- Email → email (email)
- Dates (DOB, etc.) → descriptive name (date)
- Numeric values → descriptive name (number)

4. FIELD TYPES:
- text: Names, IDs, codes, short responses
- phone: Kenyan mobile numbers
- email: Email addresses
- number: Numeric values
- date: Date inputs

5. PRICING LOGIC:
Extract base cost from phrases like "Ksh 50", "500 bob", "fee of 100", "sh.10"
If no cost mentioned: charge_price = 0

6. CONDITIONAL LOGIC FOR BENEFICIARIES:
Trigger only when text mentions: paying for others, adding beneficiaries, overpayment/tips, sponsoring multiple people
If no maximum specified: max_allowed = 999
If no beneficiaries mentioned: conditional_logic = {}

REQUIRED OUTPUT STRUCTURE:
{
  "title": "Clear, Professional Form Title",
  "description": "Brief description",
  "charge_price": <number>,
  "schema_json": [
    {"name": "mpesa_code", "label": "M-Pesa Transaction Code", "type": "text", "required": true, "placeholder": "e.g. R4A5B6C7D8"},
    // Only explicitly mentioned fields here
  ],
  "rules_json": {
    "beneficiaries": {
      "enabled_if_amount_greater_than": <charge_price>,
      "max_allowed": <number or 999>,
      "fields_per_beneficiary": ["name", "registration_number"] // only if mentioned
    },
    "allow_tip": false,
    "validation_rules": {
      "mpesa_code": {"unique": true, "exists_in_db": true, "single_use": true}
    }
  }
}

EXAMPLE 1:
Input: "Create attachment letter payment form, cost Ksh 20. Anyone paying Ksh 50 can add 1 beneficiary with name and reg no."
Output:
{
  "title": "Attachment Letter Payment",
  "description": "Payment confirmation for attachment letter",
  "charge_price": 20,
  "schema_json": [
    {"name": "mpesa_code", "label": "M-Pesa Transaction Code", "type": "text", "required": true, "placeholder": "e.g. R4A5B6C7D8"}
  ],
  "rules_json": {
    "beneficiaries": {
      "enabled_if_amount_greater_than": 50,
      "max_allowed": 1,
      "fields_per_beneficiary": ["name", "registration_number"]
    },
    "allow_tip": false,
    "validation_rules": {"mpesa_code": {"unique": true, "exists_in_db": true, "single_use": true}}
  }
}

EXAMPLE 2:
Input: "NITA form, cost Ksh 10. User may pay for others and include their names and registration numbers."
Output:
{
  "title": "NITA Payment Confirmation",
  "description": "Payment confirmation for NITA form",
  "charge_price": 10,
  "schema_json": [
    {"name": "mpesa_code", "label": "M-Pesa Transaction Code", "type": "text", "required": true, "placeholder": "e.g. R4A5B6C7D8"}
  ],
  "rules_json": {
    "beneficiaries": {
      "enabled_if_amount_greater_than": 10,
      "max_allowed": 999,
      "fields_per_beneficiary": ["name", "registration_number"]
    },
    "allow_tip": false,
    "validation_rules": {"mpesa_code": {"unique": true, "exists_in_db": true, "single_use": true}}
  }
}

EXAMPLE 3:
Input: "Form for industrial attachment fee Ksh 100. Student must provide full name, registration number, phone, and email."
Output:
{
  "title": "Industrial Attachment Fee Payment",
  "description": "Payment for industrial attachment fee",
  "charge_price": 100,
  "schema_json": [
    {"name": "mpesa_code", "label": "M-Pesa Transaction Code", "type": "text", "required": true, "placeholder": "e.g. R4A5B6C7D8"},
    {"name": "full_name", "label": "Full Name", "type": "text", "required": false, "placeholder": "Enter your full name"},
    {"name": "registration_number", "label": "Registration Number", "type": "text", "required": false, "placeholder": "e.g. ENG/001/2023"},
    {"name": "phone_number", "label": "Phone Number", "type": "phone", "required": false, "placeholder": "07XXXXXXXX"},
    {"name": "email", "label": "Email Address", "type": "email", "required": false, "placeholder": "student@example.com"}
  ],
  "rules_json": {
    "beneficiaries": {},
    "allow_tip": false,
    "validation_rules": {
      "mpesa_code": {"unique": true, "exists_in_db": true, "single_use": true},
      "phone_number": {"kenyan_mobile": true},
      "email": {"valid_format": true}
    }
  }
}

QUALITY CHECKLIST:
- mpesa_code is the first field
- All field names use snake_case
- Only explicitly mentioned fields are included
- Placeholders are helpful and relevant
- charge_price is extracted or set to 0
- Title is clear and professional
- Beneficiary logic only exists when mentioned
- Validation rules match included fields
- JSON is valid and properly formatted

CRITICAL: Output JSON only — no markdown, no explanations, no code blocks.`;

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
