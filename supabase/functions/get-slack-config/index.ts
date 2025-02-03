import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Received request for Slack configuration');

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Attempting to retrieve Slack client ID from environment');
    const clientId = Deno.env.get('SLACK_CLIENT_ID');
    console.log('Retrieved client ID:', clientId ? 'present (length: ' + clientId.length + ')' : 'missing');

    // Using more basic scopes for initial setup
    const scopes = 'chat:write,channels:read';
    console.log('Using scopes:', scopes);

    if (!clientId) {
      console.error('Slack client ID is not configured in environment');
      throw new Error('Slack client ID not configured');
    }

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
    console.error('Slack configuration error:', {
      error: error.message,
      stack: error.stack,
      type: error.constructor.name
    });

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to retrieve Slack configuration. Please check Edge Function logs.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})