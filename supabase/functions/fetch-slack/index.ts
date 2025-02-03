import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ message: 'ok' }), { headers: corsHeaders })
  }

  try {
    console.log('Starting Slack messages fetch...');
    
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
    const { data: integrations, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('provider', 'slack')
      .single()

    if (integrationError) {
      console.error('Integration fetch error:', integrationError);
      return new Response(
        JSON.stringify({ 
          error: 'No Slack integration found',
          code: 'INTEGRATION_NOT_FOUND'
        }),
        {
          headers: corsHeaders,
          status: 404,
        }
      )
    }

    if (!integrations.access_token) {
      console.error('No access token found');
      return new Response(
        JSON.stringify({ 
          error: 'No access token found',
          code: 'NO_ACCESS_TOKEN'
        }),
        {
          headers: corsHeaders,
          status: 401,
        }
      )
    }

    console.log('Fetching messages from Slack API...');
    
    // First try to list channels
    const response = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        'Authorization': `Bearer ${integrations.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Slack API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Slack channels',
          details: errorText,
          code: 'SLACK_API_ERROR'
        }),
        {
          headers: corsHeaders,
          status: response.status,
        }
      )
    }

    const channelsData = await response.json()
    
    if (!channelsData.ok) {
      console.error('Slack API error:', channelsData.error);
      return new Response(
        JSON.stringify({ 
          error: channelsData.error || 'Failed to fetch Slack channels',
          code: 'SLACK_API_ERROR'
        }),
        {
          headers: corsHeaders,
          status: 400,
        }
      )
    }

    if (!channelsData.channels || channelsData.channels.length === 0) {
      console.log('No channels found');
      return new Response(
        JSON.stringify({ messages: [] }),
        {
          headers: corsHeaders,
          status: 200,
        }
      )
    }

    // Get messages from the first channel
    const channel = channelsData.channels[0]
    console.log(`Fetching messages from channel: ${channel.name}`);
    
    const messagesResponse = await fetch(
      `https://slack.com/api/conversations.history?channel=${channel.id}&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${integrations.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error('Slack messages API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Slack messages',
          details: errorText,
          code: 'SLACK_API_ERROR'
        }),
        {
          headers: corsHeaders,
          status: messagesResponse.status,
        }
      )
    }

    const messagesData = await messagesResponse.json()
    
    if (!messagesData.ok) {
      console.error('Slack messages API error:', messagesData.error);
      return new Response(
        JSON.stringify({ 
          error: messagesData.error || 'Failed to fetch Slack messages',
          code: 'SLACK_API_ERROR'
        }),
        {
          headers: corsHeaders,
          status: 400,
        }
      )
    }

    // Format messages
    const messages = (messagesData.messages || []).map((msg: any) => ({
      id: msg.ts,
      text: msg.text,
      user: msg.user,
      timestamp: new Date(Number(msg.ts) * 1000).toISOString(),
      channel: channel.name,
    }))

    console.log(`Successfully fetched ${messages.length} messages`);

    return new Response(
      JSON.stringify({ messages }),
      {
        headers: corsHeaders,
        status: 200,
      },
    )

  } catch (error) {
    console.error('Slack fetch error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch Slack messages',
        code: 'UNKNOWN_ERROR'
      }),
      {
        headers: corsHeaders,
        status: 500,
      },
    )
  }
})