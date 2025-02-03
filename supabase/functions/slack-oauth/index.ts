import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SLACK_CLIENT_ID = Deno.env.get('SLACK_CLIENT_ID')!;
const SLACK_CLIENT_SECRET = Deno.env.get('SLACK_CLIENT_SECRET')!;

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
    console.log('Starting Slack OAuth token exchange process...');
    
    const { code, redirectUri } = await req.json();
    console.log('Received authorization code:', code ? 'present (length: ' + code.length + ')' : 'missing');
    console.log('Received redirect URI:', redirectUri);
    
    if (!code) {
      throw new Error('No authorization code provided');
    }

    if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
      console.error('Missing required environment variables:', {
        hasClientId: !!SLACK_CLIENT_ID,
        hasClientSecret: !!SLACK_CLIENT_SECRET
      });
      throw new Error('Missing required Slack credentials');
    }

    const cleanRedirectUri = new URL(redirectUri).toString().replace(/\/$/, '');
    console.log('Cleaned redirect URI:', cleanRedirectUri);
    
    console.log('Preparing token exchange request to Slack...');
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        redirect_uri: cleanRedirectUri,
      }),
    });

    const tokens = await tokenResponse.json();
    console.log('Token response status:', tokenResponse.status);
    console.log('Token response type:', tokens.token_type || 'not provided');

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        error: tokens.error,
        warning: tokens.warning
      });
      throw new Error(tokens.error || 'Failed to exchange code for access token');
    }

    console.log('Successfully received tokens');

    // Calculate token expiration (Slack tokens don't expire by default)
    const expiresAt = null;

    return new Response(
      JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in Slack OAuth process:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        detail: 'Failed to complete Slack authentication. Check Edge Function logs for details.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});