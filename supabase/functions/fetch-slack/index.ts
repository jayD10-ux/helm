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
    return new Response(null, { headers: corsHeaders })
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

    if (!integration.access_token) {
      console.error('No access token found');
      return new Response(
        JSON.stringify({ 
          error: 'No access token found',
          details: 'Please reconnect your Slack account'
        }),
        {
          headers: corsHeaders,
          status: 401,
        }
      )
    }

    console.log('Fetching messages from Slack API...');
    
    // Get user's channels
    const channelsResponse = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!channelsResponse.ok) {
      throw new Error(`Failed to fetch channels: ${channelsResponse.statusText}`);
    }

    const channelsData = await channelsResponse.json();
    
    if (!channelsData.ok) {
      throw new Error(channelsData.error || 'Failed to fetch channels');
    }

    const channels = channelsData.channels || [];
    if (channels.length === 0) {
      return new Response(
        JSON.stringify({ messages: [] }),
        { headers: corsHeaders }
      )
    }

    // Get messages from the first channel
    const channel = channels[0];
    const messagesResponse = await fetch(
      `https://slack.com/api/conversations.history?channel=${channel.id}&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!messagesResponse.ok) {
      throw new Error(`Failed to fetch messages: ${messagesResponse.statusText}`);
    }

    const messagesData = await messagesResponse.json();
    
    if (!messagesData.ok) {
      throw new Error(messagesData.error || 'Failed to fetch messages');
    }

    // Format messages
    const messages = (messagesData.messages || []).map((msg: any) => ({
      id: msg.ts,
      text: msg.text,
      user: msg.user,
      timestamp: new Date(Number(msg.ts) * 1000).toISOString(),
      channel: channel.name,
    }));

    console.log(`Successfully fetched ${messages.length} messages`);

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