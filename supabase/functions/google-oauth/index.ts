import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Google OAuth token exchange process...');
    
    const { code, redirectUri } = await req.json();
    console.log('Received authorization code:', code ? 'present' : 'missing');
    console.log('Received redirect URI:', redirectUri);
    
    if (!code) {
      console.error('No authorization code provided in request');
      throw new Error('No authorization code provided');
    }

    // Ensure the redirect URI is properly formatted
    const cleanRedirectUri = new URL(redirectUri).toString().replace(/\/$/, '');
    console.log('Cleaned redirect URI:', cleanRedirectUri);

    // Exchange the authorization code for tokens
    console.log('Sending token exchange request to Google...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: cleanRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error(`Failed to exchange code for access token: ${errorData}`);
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();
    console.log('Successfully received tokens');

    // Validate the tokens
    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    // Verify the token with Google's userinfo endpoint
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    if (!userinfoResponse.ok) {
      const errorData = await userinfoResponse.text();
      console.error('Token validation failed:', errorData);
      throw new Error('Invalid access token received from Google');
    }

    console.log('Token validated successfully with userinfo endpoint');

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

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
    console.error('Error in Google OAuth process:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        detail: 'Failed to complete Google authentication'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});