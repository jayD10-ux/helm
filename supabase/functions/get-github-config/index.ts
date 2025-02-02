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
    console.log('Starting GitHub config retrieval...');

    // Get the request origin
    const origin = req.headers.get('origin');
    console.log('Request origin:', origin);

    // Validate origin
    const allowedDomains = [
      'localhost',
      'lovable.app',
      'lovableproject.com'
    ];

    const isValidOrigin = origin ? (
      allowedDomains.some(domain => 
        origin.includes(domain) || 
        origin.endsWith('.' + domain)
      )
    ) : false;

    console.log('Origin validation:', { isValidOrigin, origin });

    if (!isValidOrigin) {
      console.error('Invalid origin:', origin);
      throw new Error(`Invalid origin: ${origin}. Must be from localhost, lovable.app, or lovableproject.com domain.`);
    }

    const clientId = Deno.env.get('GITHUB_CLIENT_ID');
    if (!clientId) {
      console.error('GitHub client ID not configured');
      throw new Error('GitHub client ID not configured');
    }

    // For security, we construct the redirect URI based on the request origin
    let redirectUri: string;
    if (origin?.includes('localhost')) {
      redirectUri = 'http://localhost:5173/oauth-callback.html';
    } else {
      // For production, use the request origin
      redirectUri = `${origin}/oauth-callback.html`;
    }

    console.log('Config retrieved successfully:', {
      clientId: clientId ? 'present' : 'missing',
      redirectUri
    });

    return new Response(
      JSON.stringify({
        clientId,
        redirectUri
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )
  } catch (error) {
    console.error('Error in get-github-config:', error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
        detail: 'Failed to retrieve GitHub configuration'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      },
    )
  }
})