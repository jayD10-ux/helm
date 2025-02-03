import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Received request for Figma configuration');

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Attempting to retrieve Figma client ID from environment');
    const clientId = Deno.env.get('FIGMA_CLIENT_ID');
    
    console.log('Environment variables status:', {
      hasClientId: !!clientId,
      clientIdLength: clientId?.length,
    });

    if (!clientId) {
      console.error('Missing required Figma credentials');
      throw new Error('Figma credentials not properly configured');
    }

    // Figma scopes for reading comments
    const scopes = 'files:read';
    console.log('Using scopes:', scopes);

    const response = {
      clientId,
      scopes,
    };
    
    console.log('Preparing successful response with config');
    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Figma configuration error:', {
      error: error.message,
      stack: error.stack,
      type: error.constructor.name
    });

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to retrieve Figma configuration. Please check Edge Function logs.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})