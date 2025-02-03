import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Received request to fetch Figma comments');

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user ID from the authorization header
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error('Invalid session');
    }

    // Get the user's Figma integration
    const { data: integrations, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'figma')
      .single();

    if (integrationError || !integrations?.access_token) {
      throw new Error('No Figma integration found');
    }

    // Fetch comments from Figma API
    // Note: This is a simplified version. In a real implementation,
    // you'd need to handle multiple files and pagination
    const fileId = 'YOUR_FILE_ID'; // This should come from the request
    const commentsResponse = await fetch(
      `https://api.figma.com/v1/files/${fileId}/comments`,
      {
        headers: {
          'Authorization': `Bearer ${integrations.access_token}`,
        },
      }
    );

    if (!commentsResponse.ok) {
      throw new Error('Failed to fetch Figma comments');
    }

    const comments = await commentsResponse.json();

    return new Response(
      JSON.stringify({
        comments: comments.comments.map((comment: any) => ({
          id: comment.id,
          message: comment.message,
          created_at: comment.created_at,
          resolved: comment.resolved,
          client_meta: comment.client_meta,
          order_id: comment.order_id,
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching Figma comments:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Failed to fetch Figma comments. Check Edge Function logs for details.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});