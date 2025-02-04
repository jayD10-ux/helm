import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const clientId = Deno.env.get('SLACK_CLIENT_ID')
    if (!clientId) {
      throw new Error('Missing Slack client ID')
    }

    // Update scopes to include necessary permissions
    const scopes = [
      'channels:read',
      'channels:history',
      'groups:read',
      'groups:history',
      'chat:write',
      'im:history',
      'im:read',
      'mpim:history',
      'mpim:read'
    ].join(' ')

    // Construct the OAuth URL
    const redirectUri = `${req.headers.get('origin')}/oauth/callback`
    console.log('Redirect URI:', redirectUri)

    const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=slack`

    console.log('Generated Slack OAuth URL:', url)

    return new Response(
      JSON.stringify({
        url,
        clientId,
        scopes,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in get-slack-config:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})