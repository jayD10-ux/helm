import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FIGMA_CLIENT_ID = Deno.env.get('FIGMA_CLIENT_ID')!;
const FIGMA_CLIENT_SECRET = Deno.env.get('FIGMA_CLIENT_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Received Figma OAuth request');

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Figma OAuth token exchange process...');
    
    const { code, redirectUri } = await req.json();
    console.log('Received authorization code:', code ? 'present (length: ' + code.length + ')' : 'missing');
    console.log('Received redirect URI:', redirectUri);
    
    if (!code) {
      throw new Error('No authorization code provided');
    }

    if (!FIGMA_CLIENT_ID || !FIGMA_CLIENT_SECRET) {
      console.error('Missing required environment variables:', {
        hasClientId: !!FIGMA_CLIENT_ID,
        hasClientSecret: !!FIGMA_CLIENT_SECRET
      });
      throw new Error('Missing required Figma credentials');
    }

    const cleanRedirectUri = new URL(redirectUri).toString().replace(/\/$/, '');
    console.log('Cleaned redirect URI:', cleanRedirectUri);
    
    console.log('Preparing token exchange request to Figma...');
    const tokenResponse = await fetch('https://www.figma.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: FIGMA_CLIENT_ID,
        client_secret: FIGMA_CLIENT_SECRET,
        redirect_uri: cleanRedirectUri,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        error: tokens.error,
      });
      throw new Error(tokens.error_description || 'Failed to exchange code for access token');
    }

    console.log('Successfully received tokens');

    // Calculate token expiration (Figma tokens expire in 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    return new Response(
      JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in Figma OAuth process:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        detail: 'Failed to complete Figma authentication. Check Edge Function logs for details.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});