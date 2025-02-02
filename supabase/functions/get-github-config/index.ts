import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to safely parse URLs
const parseUrl = (url: string): URL | null => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

// Updated to use proper URL parsing for origin validation
const isAllowedOrigin = (origin: string | null): boolean => {
  console.log('Validating origin:', origin);
  
  if (!origin) {
    console.log('No origin provided');
    return false;
  }

  const parsedUrl = parseUrl(origin);
  if (!parsedUrl) {
    console.log('Invalid URL format:', origin);
    return false;
  }

  // Local development URLs
  if (parsedUrl.hostname === 'localhost') {
    console.log('Localhost origin accepted:', origin);
    return true;
  }

  // Preview URLs
  if (parsedUrl.hostname.endsWith('lovable.app') || parsedUrl.hostname.endsWith('lovableproject.com')) {
    console.log('Preview domain accepted:', origin);
    return true;
  }

  console.log('Origin not allowed:', origin);
  return false;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Fetching GitHub config...')
    const clientId = Deno.env.get('GITHUB_CLIENT_ID')
    console.log('Client ID available:', !!clientId)
    
    if (!clientId) {
      console.error('GITHUB_CLIENT_ID not found in environment variables')
      throw new Error('GitHub Client ID not configured')
    }

    // Get and validate the origin
    const origin = req.headers.get('origin')
    console.log('Request origin:', origin)

    if (!isAllowedOrigin(origin)) {
      console.error('Invalid origin:', origin)
      throw new Error(origin 
        ? `Invalid origin: ${origin}. Must be from localhost, lovable.app, or lovableproject.com domain.`
        : 'Origin header is required'
      )
    }

    // Construct the redirect URI
    const redirectUri = `${origin}/oauth-callback.html`
    console.log('Constructed redirect URI:', redirectUri)
    console.log('IMPORTANT: This redirect URI must be registered in GitHub OAuth app settings')

    return new Response(
      JSON.stringify({
        clientId,
        redirectUri,
        message: 'GitHub config retrieved successfully'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error in get-github-config:', error.message)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        detail: 'Failed to retrieve GitHub configuration'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})