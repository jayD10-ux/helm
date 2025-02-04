import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MERGE_API_KEY = Deno.env.get('MERGE_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting Slack messages fetch via Merge.dev...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user's Slack integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('provider', 'slack')
      .single()

    if (integrationError) {
      console.error('Integration fetch error:', integrationError);
      return new Response(
        JSON.stringify({ 
          error: 'No Slack integration found',
          details: integrationError.message
        }),
        {
          headers: corsHeaders,
          status: 404,
        }
      )
    }

    if (!integration.merge_account_token) {
      console.error('No Merge.dev account token found');
      return new Response(
        JSON.stringify({ 
          error: 'No account token found',
          details: 'Please reconnect your Slack account'
        }),
        {
          headers: corsHeaders,
          status: 401,
        }
      )
    }

    console.log('Fetching messages from Merge.dev API...');
    
    // Get messages using Merge.dev's unified API
    const messagesResponse = await fetch(
      'https://api.merge.dev/api/ticketing/v1/messages?include_deleted=false',
      {
        headers: {
          'Authorization': `Bearer ${integration.merge_account_token}`,
          'X-Account-Token': integration.merge_account_id,
        },
      }
    )

    if (!messagesResponse.ok) {
      const error = await messagesResponse.text();
      console.error('Merge.dev API error:', error);
      throw new Error('Failed to fetch messages from Merge.dev');
    }

    const data = await messagesResponse.json();
    console.log(`Successfully fetched ${data.results?.length || 0} messages`);

    // Format messages
    const messages = (data.results || []).map((msg: any) => ({
      id: msg.remote_id,
      text: msg.body,
      user: msg.sender_name,
      timestamp: msg.created_at,
      channel: msg.channel_name || 'Unknown Channel',
    }));

    return new Response(
      JSON.stringify({ messages }),
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error in fetch-slack:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch Slack messages',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: corsHeaders,
        status: 500,
      }
    )
  }
})