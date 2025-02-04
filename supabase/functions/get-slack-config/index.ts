import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const MERGE_API_KEY = Deno.env.get('MERGE_API_KEY')!;

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
    console.log('Getting Slack OAuth configuration from Merge.dev...');

    if (!MERGE_API_KEY) {
      console.error('Missing MERGE_API_KEY environment variable');
      throw new Error('Server configuration error');
    }

    // Get the OAuth URL from Merge.dev
    const response = await fetch('https://api.merge.dev/api/integrations/slack/link-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        end_user_origin: req.headers.get('origin') || '',
        end_user_email_address: 'user@example.com', // This will be overwritten by Merge
        categories: ['ticketing'],
        integration: 'slack',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Merge.dev API error:', error);
      throw new Error('Failed to get Slack configuration');
    }

    const data = await response.json();
    console.log('Successfully got Slack configuration');

    return new Response(
      JSON.stringify({ url: data.link_token }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in get-slack-config:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to get Slack configuration',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});