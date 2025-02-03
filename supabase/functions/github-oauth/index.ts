import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    
    const { code, redirectUri } = await req.json()
    console.log('Received authorization code:', code ? 'present' : 'missing');
    console.log('Received redirect URI:', redirectUri);
    
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

    // Ensure the redirect URI is properly formatted
    const cleanRedirectUri = new URL(redirectUri).toString().replace(/\/$/, '');
    console.log('Cleaned redirect URI:', cleanRedirectUri);

    // Prepare the token exchange request
    const tokenRequest = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: cleanRedirectUri
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

    console.log('GitHub OAuth process completed successfully');
    return new Response(
      JSON.stringify({ 
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
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