import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ORIGINS = [
  'https://preview--cockpit-flux-dashboard.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

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

    if (!origin) {
      console.error('No origin header found')
      throw new Error('Origin header is required')
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      console.error('Invalid origin:', origin)
      console.error('Allowed origins:', ALLOWED_ORIGINS)
      throw new Error('Invalid origin. Must be one of the allowed origins.')
    }

    // Construct the redirect URI
    const redirectUri = `${origin}/oauth-callback.html`
    console.log('Constructed redirect URI:', redirectUri)
    console.log('IMPORTANT: This redirect URI must be registered in GitHub OAuth app settings')
    console.log('GitHub OAuth app settings URL: https://github.com/settings/developers')

    return new Response(
      JSON.stringify({
        clientId,
        redirectUri,
        message: 'GitHub config retrieved successfully',
        allowedOrigins: ALLOWED_ORIGINS
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
        detail: 'Failed to retrieve GitHub configuration',
        allowedOrigins: ALLOWED_ORIGINS
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