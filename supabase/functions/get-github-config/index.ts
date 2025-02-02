import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GITHUB_CLIENT_ID = Deno.env.get('GITHUB_CLIENT_ID')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the origin from request headers
    const origin = req.headers.get('origin') || '';
    console.log('Request origin:', origin);

    // Construct the redirect URI
    const redirectUri = `${origin}/oauth-callback.html`;
    console.log('Constructed redirect URI:', redirectUri);

    return new Response(
      JSON.stringify({
        clientId: GITHUB_CLIENT_ID,
        redirectUri,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in get-github-config function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});