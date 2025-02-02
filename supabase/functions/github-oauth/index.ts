import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting GitHub OAuth token exchange process...');
    
    const { code } = await req.json()
    console.log('Received authorization code:', code ? 'present' : 'missing');
    
    if (!code) {
      console.error('No authorization code provided in request');
      throw new Error('No authorization code provided')
    }

    // Get GitHub OAuth credentials
    const clientId = Deno.env.get('GITHUB_CLIENT_ID');
    const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET');

    console.log('GitHub credentials check:', {
      clientId: clientId ? 'present' : 'missing',
      clientSecret: clientSecret ? 'present' : 'missing'
    });

    if (!clientId || !clientSecret) {
      console.error('Missing GitHub OAuth credentials');
      throw new Error('GitHub OAuth credentials not configured');
    }

    // Get the origin for the redirect URI
    const origin = req.headers.get('origin');
    console.log('Request origin:', origin);

    // Construct redirect URI based on origin
    const redirectUri = origin?.includes('localhost') 
      ? 'http://localhost:5173/oauth-callback.html'
      : `${origin}/oauth-callback.html`;
    
    console.log('Using redirect URI:', redirectUri);

    // Prepare the token exchange request
    const tokenRequest = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri
    };

    console.log('Sending token exchange request to GitHub...');
    
    // Exchange code for access token with detailed logging
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Lovable-App'
      },
      body: JSON.stringify(tokenRequest),
    });

    console.log('Token response status:', tokenResponse.status);
    
    const tokenData = await tokenResponse.json();
    console.log('Token response type:', tokenData.error ? 'error' : 'success');
    
    if (tokenData.error) {
      console.error('GitHub OAuth error:', {
        error: tokenData.error,
        description: tokenData.error_description
      });
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      throw new Error('No access token received from GitHub');
    }

    console.log('Successfully received access token');

    // Get user info from GitHub
    console.log('Fetching user info from GitHub...');
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Lovable-App'
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch GitHub user:', userResponse.status);
      throw new Error('Failed to fetch GitHub user information');
    }

    const userData = await userResponse.json();
    console.log('Successfully fetched GitHub user info');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user ID from auth header
    const authHeader = req.headers.get('authorization')?.split(' ')[1];
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header');
    }

    console.log('Getting Supabase user...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader);
    if (userError) {
      console.error('Failed to get Supabase user:', userError);
      throw userError;
    }

    console.log('Storing integration data...');
    // Store integration data
    const { error: integrationError } = await supabaseClient
      .from('integrations')
      .upsert({
        user_id: user.id,
        provider: 'github',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      }, {
        onConflict: 'user_id,provider'
      });

    if (integrationError) {
      console.error('Failed to store integration:', integrationError);
      throw integrationError;
    }

    console.log('GitHub OAuth process completed successfully');
    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          login: userData.login,
          avatar_url: userData.avatar_url
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in GitHub OAuth process:', error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        detail: 'Failed to complete GitHub authentication'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});