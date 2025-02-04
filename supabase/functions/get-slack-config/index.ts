import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MERGE_API_KEY = Deno.env.get('MERGE_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Slack OAuth configuration process...');

    // Create Supabase client to get user session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
    
    if (sessionError || !session?.user?.email) {
      console.error('Session error:', sessionError);
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: 'Please sign in to continue'
        }),
        {
          headers: corsHeaders,
          status: 401,
        }
      );
    }

    console.log('User authenticated, email:', session.user.email);

    if (!MERGE_API_KEY) {
      console.error('Missing MERGE_API_KEY environment variable');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          message: 'Missing API key configuration'
        }),
        {
          headers: corsHeaders,
          status: 500,
        }
      );
    }

    console.log('Requesting link token from Merge.dev...');

    // Get the OAuth URL from Merge.dev
    const response = await fetch('https://api.merge.dev/api/integrations/slack/link-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        end_user_origin: req.headers.get('origin') || '',
        end_user_email_address: session.user.email,
        categories: ['ticketing'],
        integration: 'slack',
      }),
    });

    console.log('Merge.dev response status:', response.status);
    
    const responseText = await response.text();
    console.log('Merge.dev raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Merge.dev response:', responseText);
      return new Response(
        JSON.stringify({
          error: 'Invalid response',
          message: 'Received invalid response from authentication service',
          details: responseText
        }),
        {
          headers: corsHeaders,
          status: 502,
        }
      );
    }

    if (!response.ok) {
      console.error('Merge.dev API error:', data);
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          message: data.error || 'Failed to get Slack configuration',
          details: data
        }),
        {
          headers: corsHeaders,
          status: response.status,
        }
      );
    }

    if (!data.link_token) {
      console.error('No link token in response:', data);
      return new Response(
        JSON.stringify({
          error: 'Invalid response',
          message: 'No authentication URL received',
          details: data
        }),
        {
          headers: corsHeaders,
          status: 502,
        }
      );
    }

    console.log('Successfully received link token');

    return new Response(
      JSON.stringify({ url: data.link_token }),
      { 
        headers: corsHeaders,
        status: 200,
      }
    );

  } catch (error) {
    console.error('Unexpected error in get-slack-config:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Server error',
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : undefined
      }),
      {
        headers: corsHeaders,
        status: 500,
      }
    );
  }
});