import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MERGE_API_KEY = Deno.env.get('MERGE_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Received Slack OAuth request');

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Merge.dev OAuth token exchange process...');
    
    const { code, redirectUri } = await req.json();
    console.log('Received authorization code:', code ? 'present' : 'missing');
    console.log('Received redirect URI:', redirectUri);
    
    if (!code) {
      throw new Error('No authorization code provided');
    }

    if (!MERGE_API_KEY) {
      console.error('Missing required environment variables');
      throw new Error('Missing required Merge.dev credentials');
    }

    // Exchange code for Merge.dev account token
    console.log('Exchanging code for Merge.dev account token...');
    const response = await fetch('https://api.merge.dev/api/integrations/slack/account-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange code for account token');
    }

    const data = await response.json();
    console.log('Successfully received account token');

    return new Response(
      JSON.stringify({
        merge_account_token: data.account_token,
        merge_account_id: data.account_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in Slack OAuth process:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to complete authentication',
        detail: 'Failed to complete Merge.dev authentication. Check Edge Function logs for details.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});