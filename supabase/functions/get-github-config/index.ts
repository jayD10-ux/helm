import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const clientId = Deno.env.get('GITHUB_CLIENT_ID')
    console.log('Retrieved GitHub Client ID:', clientId ? 'Found' : 'Not Found')
    
    if (!clientId) {
      throw new Error('GitHub Client ID not configured')
    }

    return new Response(
      JSON.stringify({ 
        clientId,
        status: 'success'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )
  } catch (error) {
    console.error('Error in get-github-config:', error.message)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        status: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      },
    )
  }
})