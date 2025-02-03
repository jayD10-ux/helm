import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

async function refreshGoogleToken(refresh_token: string) {
  console.log('Refreshing Google access token...');
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ message: 'ok' }), { headers: corsHeaders });
  }

  try {
    console.log('Starting Gmail fetch process...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Validate auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }),
        {
          headers: corsHeaders,
          status: 401,
        }
      )
    }

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      console.error('User verification failed:', userError)
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          code: 'AUTH_FAILED'
        }),
        {
          headers: corsHeaders,
          status: 401,
        }
      )
    }

    console.log('User authenticated:', user.id)

    // Get the current integration
    const { data: integrations, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single()

    if (integrationError || !integrations) {
      console.error('Failed to fetch integration:', integrationError)
      return new Response(
        JSON.stringify({ 
          error: 'Gmail integration not found',
          code: 'INTEGRATION_NOT_FOUND'
        }),
        {
          headers: corsHeaders,
          status: 404,
        }
      )
    }

    let { access_token, refresh_token, expires_at } = integrations

    // Check if token is expired
    if (expires_at && new Date(expires_at) < new Date()) {
      console.log('Access token expired, attempting refresh...')
      
      if (!refresh_token) {
        console.error('No refresh token available')
        return new Response(
          JSON.stringify({ 
            error: 'Gmail access expired. Please reconnect your account.',
            code: 'TOKEN_EXPIRED_NO_REFRESH'
          }),
          {
            headers: corsHeaders,
            status: 401,
          }
        )
      }

      try {
        const { access_token: new_token, expires_in } = await refreshGoogleToken(refresh_token)
        
        // Update token in database
        const expires_at = new Date()
        expires_at.setSeconds(expires_at.getSeconds() + expires_in)
        
        const { error: updateError } = await supabaseClient
          .from('integrations')
          .update({ 
            access_token: new_token,
            expires_at: expires_at.toISOString()
          })
          .eq('user_id', user.id)
          .eq('provider', 'google')

        if (updateError) {
          console.error('Failed to update token:', updateError)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to update access token',
              code: 'TOKEN_UPDATE_FAILED'
            }),
            {
              headers: corsHeaders,
              status: 500,
            }
          )
        }

        access_token = new_token
      } catch (error) {
        console.error('Token refresh failed:', error)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to refresh Gmail access. Please reconnect your account.',
            code: 'TOKEN_REFRESH_FAILED'
          }),
          {
            headers: corsHeaders,
            status: 401,
          }
        )
      }
    }

    console.log('Fetching Gmail messages...')
    
    // Make request to Gmail API
    const gmailResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        }
      }
    )

    console.log('Gmail API response status:', gmailResponse.status)
    
    if (!gmailResponse.ok) {
      const error = await gmailResponse.text()
      console.error('Gmail API error:', error)
      
      if (gmailResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Gmail access expired. Please reconnect your account.',
            code: 'TOKEN_INVALID'
          }),
          {
            headers: corsHeaders,
            status: 401,
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch emails from Gmail',
          code: 'GMAIL_API_ERROR'
        }),
        {
          headers: corsHeaders,
          status: gmailResponse.status,
        }
      )
    }

    const { messages } = await gmailResponse.json()
    console.log(`Found ${messages?.length || 0} messages`)

    if (!messages || !Array.isArray(messages)) {
      console.log('No messages found')
      return new Response(
        JSON.stringify({ emails: [] }),
        {
          headers: corsHeaders,
          status: 200,
        }
      )
    }

    // Fetch message details
    console.log('Fetching message details...')
    const messageDetails = await Promise.all(
      messages.map(async (msg: { id: string }) => {
        console.log(`Fetching details for message ${msg.id}...`)
        
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Accept': 'application/json',
            }
          }
        )

        if (!msgResponse.ok) {
          console.error(`Error fetching message ${msg.id}:`, await msgResponse.text())
          return null
        }

        const msgData = await msgResponse.json()
        console.log(`Successfully fetched details for message ${msg.id}`)
        return msgData
      })
    )

    // Format emails
    const formattedEmails = messageDetails
      .filter(msg => msg !== null)
      .map(msg => ({
        id: msg.id,
        subject: msg.payload.headers.find((h: {name: string}) => 
          h.name.toLowerCase() === 'subject')?.value || 'No Subject',
        from: msg.payload.headers.find((h: {name: string}) => 
          h.name.toLowerCase() === 'from')?.value || 'Unknown',
        date: msg.payload.headers.find((h: {name: string}) => 
          h.name.toLowerCase() === 'date')?.value,
        snippet: msg.snippet,
      }))

    console.log(`Successfully processed ${formattedEmails.length} emails`)

    return new Response(
      JSON.stringify({ emails: formattedEmails }),
      {
        headers: corsHeaders,
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in fetch-gmail function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
      }),
      {
        headers: corsHeaders,
        status: 500,
      }
    )
  }
})