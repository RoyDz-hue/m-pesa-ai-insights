import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  const random = Math.random().toString(36).substring(2, 8);
  return `${base}-${random}`;
}

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

    const { formId, action } = await req.json();

    if (!formId) {
      return new Response(JSON.stringify({ error: 'Form ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the form
    const { data: form, error: fetchError } = await supabaseClient
      .from('public_forms')
      .select('*')
      .eq('id', formId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !form) {
      return new Response(JSON.stringify({ error: 'Form not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      const { error: deleteError } = await supabaseClient
        .from('public_forms')
        .delete()
        .eq('id', formId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error('Failed to delete form');
      }

      return new Response(JSON.stringify({ message: 'Form deleted successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'unpublish') {
      const { data: updated, error: updateError } = await supabaseClient
        .from('public_forms')
        .update({ status: 'draft', public_slug: null })
        .eq('id', formId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to unpublish form');
      }

      return new Response(JSON.stringify({ 
        form: updated,
        message: 'Form unpublished' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: publish
    if (form.status === 'published') {
      return new Response(JSON.stringify({ 
        form,
        publicUrl: `/form/${form.public_slug}`,
        message: 'Form is already published' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slug = generateSlug(form.title);

    const { data: published, error: publishError } = await supabaseClient
      .from('public_forms')
      .update({ 
        status: 'published',
        public_slug: slug 
      })
      .eq('id', formId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (publishError) {
      console.error('Publish error:', publishError);
      throw new Error('Failed to publish form');
    }

    return new Response(JSON.stringify({ 
      form: published,
      publicUrl: `/form/${slug}`,
      message: 'Form published successfully!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('publish-form error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
