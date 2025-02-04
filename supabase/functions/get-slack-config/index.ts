import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const MERGE_API_KEY = Deno.env.get('MERGE_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Getting Slack OAuth configuration from Merge.dev...');

    if (!MERGE_API_KEY) {
      console.error('Missing MERGE_API_KEY environment variable');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          message: 'Missing API key configuration'
        }),
        {
          headers: corsHeaders,
          status: 500,
        }
      );
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

    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Merge.dev response:', responseText);
      return new Response(
        JSON.stringify({
          error: 'Invalid response',
          message: 'Received invalid response from authentication service'
        }),
        {
          headers: corsHeaders,
          status: 502,
        }
      );
    }

    if (!response.ok) {
      console.error('Merge.dev API error:', data);
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          message: data.error || 'Failed to get Slack configuration from authentication service'
        }),
        {
          headers: corsHeaders,
          status: 400,
        }
      );
    }

    if (!data.link_token) {
      console.error('No link token in response:', data);
      return new Response(
        JSON.stringify({
          error: 'Invalid response',
          message: 'No authentication URL received from service'
        }),
        {
          headers: corsHeaders,
          status: 502,
        }
      );
    }

    console.log('Successfully got Slack configuration');

    return new Response(
      JSON.stringify({ url: data.link_token }),
      { 
        headers: corsHeaders,
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in get-slack-config:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Server error',
        message: 'An unexpected error occurred while getting Slack configuration',
        details: error instanceof Error ? error.message : undefined
      }),
      {
        headers: corsHeaders,
        status: 500,
      }
    );
  }
});