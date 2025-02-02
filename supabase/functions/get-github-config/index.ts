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
    console.log('Fetching GitHub config...')
    const clientId = Deno.env.get('GITHUB_CLIENT_ID')
    console.log('Client ID available:', !!clientId)
    
    if (!clientId) {
      console.error('GITHUB_CLIENT_ID not found in environment variables')
      throw new Error('GitHub Client ID not configured')
    }

    // Construct the redirect URI
    const redirectUri = `${req.headers.get('origin')}/oauth-callback.html`
    console.log('Constructed redirect URI:', redirectUri)

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