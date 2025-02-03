import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    if (integrationError || !integrations) {
      throw new Error('No Slack integration found')
    }

    // Fetch messages from Slack
    const response = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        'Authorization': `Bearer ${integrations.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Slack channels')
    }

    const channelsData = await response.json()
    
    if (!channelsData.ok) {
      throw new Error(channelsData.error || 'Failed to fetch Slack channels')
    }

    // Get the first channel's messages
    const channel = channelsData.channels[0]
    const messagesResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channel.id}`, {
      headers: {
        'Authorization': `Bearer ${integrations.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!messagesResponse.ok) {
      throw new Error('Failed to fetch Slack messages')
    }

    const messagesData = await messagesResponse.json()
    
    if (!messagesData.ok) {
      throw new Error(messagesData.error || 'Failed to fetch Slack messages')
    }

    // Format messages
    const messages = messagesData.messages.map((msg: any) => ({
      id: msg.ts,
      text: msg.text,
      user: msg.user,
      timestamp: new Date(Number(msg.ts) * 1000).toISOString(),
      channel: channel.name,
    }))

    return new Response(
      JSON.stringify({ messages }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Slack fetch error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to fetch Slack messages',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})