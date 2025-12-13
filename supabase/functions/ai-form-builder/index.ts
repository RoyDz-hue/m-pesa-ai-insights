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

    const systemPrompt = `You are an EXPERT AI Form Builder that reads natural language descriptions and extracts EVERY SINGLE field mentioned into a structured form schema. You must be EXHAUSTIVE and COMPREHENSIVE.

YOUR PRIMARY MISSION:
Read the admin's text carefully and extract EVERY piece of information they want to collect. The admin writes in plain, conversational text - your job is to identify ALL data points they need and create appropriate form fields.

CRITICAL RULES:

1. MANDATORY FIRST FIELD (Always include this):
{"name": "mpesa_code", "label": "M-Pesa Transaction Code", "type": "text", "required": true, "placeholder": "e.g. R4A5B6C7D8"}

2. EXTRACT EVERYTHING - Read the text thoroughly and create fields for:
- Every piece of personal information mentioned (names, IDs, phone numbers, emails, etc.)
- Every preference or choice mentioned (dietary requirements, t-shirt sizes, etc.)
- Every yes/no question implied (need transport?, need accommodation?, etc.)
- Every optional detail mentioned (messages, dedications, notes, etc.)
- Every conditional data point (group leader info, extra attendees, etc.)

3. FIELD TYPES TO USE:
- "text": Names, IDs, codes, addresses, short text, messages
- "phone": Phone numbers (Kenyan format 07XXXXXXXX)
- "email": Email addresses
- "number": Numeric values (counts, quantities, amounts)
- "date": Date inputs
- "select": Dropdown choices (t-shirt sizes, year of study, etc.)
- "textarea": Long text (messages, dedications, notes)
- "checkbox": Yes/no choices (need transport?, is group leader?, etc.)

4. SELECT FIELD OPTIONS - When a field has predefined choices, include options:
{"name": "tshirt_size", "label": "T-Shirt Size", "type": "select", "required": false, "options": ["S", "M", "L", "XL", "XXL"], "placeholder": "Select size"}
{"name": "dietary_requirements", "label": "Dietary Requirements", "type": "select", "required": false, "options": ["None", "Vegetarian", "Vegan", "Halal", "Gluten-free", "Nut allergy", "Seafood allergy", "Other"], "placeholder": "Select if applicable"}

5. BENEFICIARY SYSTEM - When users can pay for others:
- Set up beneficiary rules in rules_json
- Specify what fields each beneficiary needs (copy from main person's fields where relevant)
- Calculate thresholds based on pricing mentioned

6. CONDITIONAL FIELDS - When certain fields only apply in certain conditions:
- Transport fields (need_transport, transport_seats, return_trip)
- Accommodation fields (need_accommodation, num_rooms, room_sharing_names)
- Group leader fields (is_group_leader, position, club_name)
- Add these with "condition" property explaining when they appear

OUTPUT STRUCTURE (MUST BE VALID JSON):
{
  "title": "Professional Form Title",
  "description": "Clear description of what this form is for",
  "charge_price": <extracted_cost_number>,
  "schema_json": [
    {"name": "mpesa_code", "label": "M-Pesa Transaction Code", "type": "text", "required": true, "placeholder": "e.g. R4A5B6C7D8"},
    // ALL fields for the MAIN PAYER go here
    // Include EVERY field mentioned in the text
  ],
  "rules_json": {
    "beneficiaries": {
      "enabled": true/false,
      "tiers": [
        {"min_amount": 3000, "max_beneficiaries": 1},
        {"min_amount": 5000, "max_beneficiaries": 3}
      ],
      "fields_per_beneficiary": [
        {"name": "beneficiary_name", "label": "Full Name", "type": "text", "required": true},
        // Include ALL fields needed per beneficiary
      ]
    },
    "conditional_sections": {
      "group_leader": {
        "condition": "amount >= 10000 OR beneficiary_count >= 5",
        "fields": [
          {"name": "is_group_leader", "label": "Are you a group leader?", "type": "checkbox"},
          {"name": "position", "label": "Official Position", "type": "text"},
          {"name": "club_name", "label": "Club/Class Name", "type": "text"}
        ]
      },
      "transport": {
        "fields": [
          {"name": "need_transport", "label": "Need shuttle transport?", "type": "checkbox"},
          {"name": "transport_seats", "label": "Number of seats", "type": "number"},
          {"name": "return_trip", "label": "Need return trip?", "type": "checkbox"}
        ]
      },
      "accommodation": {
        "extra_cost_per_room": 1500,
        "fields": [
          {"name": "need_accommodation", "label": "Need overnight accommodation?", "type": "checkbox"},
          {"name": "num_rooms", "label": "Number of rooms needed", "type": "number"},
          {"name": "room_sharing_names", "label": "Names of room occupants", "type": "textarea"}
        ]
      }
    },
    "validation_rules": {
      "mpesa_code": {"unique": true, "exists_in_db": true, "single_use": true}
    }
  }
}

COMPREHENSIVE EXAMPLE:

INPUT: "The annual faculty gala dinner costs two thousand shillings per head. If anyone sends three thousand they can add one extra attendee, five thousand allows three extras. For each person we need their full name, registration number, department, and phone number. Everyone should indicate dietary requirements (vegetarian, halal, gluten-free, nut allergy) and t-shirt size (S/M/L/XL/XXL). The main payer should give their full name, registration number, year of study, department, phone, email, and national ID. If from another university, include institution name. Anyone paying for 5+ people is a group leader and should give their position and club name. Ask about transport - do they need shuttle and how many seats and return trip. Optional overnight stay costs 1500 per room, ask how many rooms and who shares. Allow a short dedication message max 100 chars."

OUTPUT:
{
  "title": "Faculty Gala Dinner Payment Confirmation",
  "description": "Confirm your payment for the annual faculty gala dinner event",
  "charge_price": 2000,
  "schema_json": [
    {"name": "mpesa_code", "label": "M-Pesa Transaction Code", "type": "text", "required": true, "placeholder": "e.g. R4A5B6C7D8"},
    {"name": "full_name", "label": "Full Name", "type": "text", "required": true, "placeholder": "Enter your full name"},
    {"name": "registration_number", "label": "Registration Number", "type": "text", "required": true, "placeholder": "e.g. ENG/001/2023"},
    {"name": "year_of_study", "label": "Year of Study", "type": "select", "required": true, "options": ["1", "2", "3", "4", "5", "Postgraduate"], "placeholder": "Select year"},
    {"name": "department", "label": "Department", "type": "text", "required": true, "placeholder": "e.g. Computer Science"},
    {"name": "phone_number", "label": "Phone Number", "type": "phone", "required": true, "placeholder": "07XXXXXXXX"},
    {"name": "email", "label": "Email Address", "type": "email", "required": true, "placeholder": "student@example.com"},
    {"name": "national_id", "label": "National ID Number", "type": "text", "required": true, "placeholder": "Enter ID number"},
    {"name": "is_external_student", "label": "Are you from another university?", "type": "checkbox", "required": false},
    {"name": "institution_name", "label": "Institution Name", "type": "text", "required": false, "placeholder": "Enter if from another university", "condition": "is_external_student"},
    {"name": "dietary_requirements", "label": "Dietary Requirements", "type": "select", "required": false, "options": ["None", "Vegetarian", "Halal", "Gluten-free", "Nut allergy", "Seafood allergy", "Other"], "placeholder": "Select if applicable"},
    {"name": "tshirt_size", "label": "T-Shirt Size", "type": "select", "required": true, "options": ["S", "M", "L", "XL", "XXL"], "placeholder": "Select your size"},
    {"name": "need_transport", "label": "Need shuttle transport from campus?", "type": "checkbox", "required": false},
    {"name": "transport_seats", "label": "Number of shuttle seats needed", "type": "number", "required": false, "placeholder": "Enter number", "condition": "need_transport"},
    {"name": "return_trip", "label": "Need return trip as well?", "type": "checkbox", "required": false, "condition": "need_transport"},
    {"name": "need_accommodation", "label": "Need overnight accommodation? (Ksh 1500/room)", "type": "checkbox", "required": false},
    {"name": "num_rooms", "label": "Number of rooms needed", "type": "number", "required": false, "placeholder": "Rooms are double occupancy", "condition": "need_accommodation"},
    {"name": "room_sharing_names", "label": "Names of people sharing rooms", "type": "textarea", "required": false, "placeholder": "List who shares each room", "condition": "need_accommodation"},
    {"name": "dedication_message", "label": "Dedication Message (max 100 chars)", "type": "text", "required": false, "placeholder": "Message to display on screen", "maxLength": 100}
  ],
  "rules_json": {
    "beneficiaries": {
      "enabled": true,
      "tiers": [
        {"min_amount": 3000, "max_beneficiaries": 1},
        {"min_amount": 5000, "max_beneficiaries": 3}
      ],
      "fields_per_beneficiary": [
        {"name": "beneficiary_full_name", "label": "Full Name", "type": "text", "required": true},
        {"name": "beneficiary_registration_number", "label": "Registration Number", "type": "text", "required": true},
        {"name": "beneficiary_department", "label": "Department", "type": "text", "required": true},
        {"name": "beneficiary_phone", "label": "Phone Number", "type": "phone", "required": true},
        {"name": "beneficiary_dietary", "label": "Dietary Requirements", "type": "select", "required": false, "options": ["None", "Vegetarian", "Halal", "Gluten-free", "Nut allergy", "Seafood allergy", "Other"]},
        {"name": "beneficiary_tshirt", "label": "T-Shirt Size", "type": "select", "required": true, "options": ["S", "M", "L", "XL", "XXL"]}
      ]
    },
    "conditional_sections": {
      "group_leader": {
        "condition": "beneficiary_count >= 5 OR amount >= 10000",
        "fields": [
          {"name": "is_group_leader", "label": "Are you organizing this as a group leader?", "type": "checkbox"},
          {"name": "leader_position", "label": "Official Position", "type": "text", "placeholder": "e.g. Chairperson, Treasurer"},
          {"name": "club_or_class", "label": "Club/Class Represented", "type": "text", "placeholder": "e.g. Computer Science Class of 2025"}
        ]
      }
    },
    "accommodation_extra_cost": 1500,
    "validation_rules": {
      "mpesa_code": {"unique": true, "exists_in_db": true, "single_use": true},
      "phone_number": {"kenyan_mobile": true},
      "email": {"valid_format": true}
    }
  }
}

REMEMBER:
1. Output ONLY valid JSON - no markdown, no explanations, no code blocks
2. Extract EVERY single data point mentioned in the text
3. For complex forms, you may have 20-30+ fields - that's expected
4. Use appropriate field types and include options for select fields
5. Set up beneficiary tiers correctly based on pricing mentioned
6. Include conditional fields where appropriate
7. The main payer's fields go in schema_json, beneficiary fields go in rules_json.beneficiaries.fields_per_beneficiary`;

    console.log('Processing form request:', message.substring(0, 100));

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this form request and extract ALL fields mentioned. Be EXHAUSTIVE - do not miss any data point. Create a comprehensive form schema:\n\n${message}` }
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

    console.log('AI Response received, length:', aiContent?.length);

    if (!aiContent) {
      throw new Error('No AI response received');
    }

    // Parse AI response
    let formSchema;
    try {
      // Clean up potential markdown formatting
      let cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to find JSON in the response if it's wrapped in other text
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      formSchema = JSON.parse(cleanContent);
      console.log('Parsed form schema - fields count:', formSchema.schema_json?.length);
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse form schema from AI');
    }

    // Validate required fields
    if (!formSchema.title || !formSchema.schema_json || !Array.isArray(formSchema.schema_json)) {
      throw new Error('Invalid form schema structure');
    }

    // Ensure mpesa_code is first
    const hasMpesaCode = formSchema.schema_json.some((f: any) => f.name === 'mpesa_code');
    if (!hasMpesaCode) {
      formSchema.schema_json.unshift({
        name: 'mpesa_code',
        label: 'M-Pesa Transaction Code',
        type: 'text',
        required: true,
        placeholder: 'e.g. R4A5B6C7D8'
      });
    }

    // If formId is provided, update existing form
    if (formId) {
      const { data: updatedForm, error: updateError } = await supabaseClient
        .from('public_forms')
        .update({
          title: formSchema.title,
          description: formSchema.description || '',
          charge_price: formSchema.charge_price || 0,
          schema_json: formSchema.schema_json,
          rules_json: formSchema.rules_json || {},
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
        message: `Form updated with ${formSchema.schema_json.length} fields. Review and publish when ready.`
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
        description: formSchema.description || '',
        charge_price: formSchema.charge_price || 0,
        schema_json: formSchema.schema_json,
        rules_json: formSchema.rules_json || {},
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
      message: `Form created with ${formSchema.schema_json.length} fields including: ${formSchema.schema_json.slice(0, 5).map((f: any) => f.label).join(', ')}${formSchema.schema_json.length > 5 ? ` and ${formSchema.schema_json.length - 5} more` : ''}. Review and publish when ready.`
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
