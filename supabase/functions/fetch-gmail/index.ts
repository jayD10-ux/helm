import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('Starting Gmail fetch process...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Validate auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      throw new Error('No authorization header')
    }

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      console.error('User verification failed:', userError)
      throw userError || new Error('User not found')
    }

    console.log('User authenticated:', user.id)

    // Parse request body
    const requestBody = await req.json()
    console.log('Request body received:', {
      hasAccessToken: !!requestBody?.access_token,
      tokenLength: requestBody?.access_token?.length
    })

    if (!requestBody || typeof requestBody !== 'object') {
      console.error('Invalid request body format')
      throw new Error('Invalid request body format')
    }

    const { access_token } = requestBody
    
    if (!access_token) {
      console.error('Missing access_token in request body')
      throw new Error('No access token provided')
    }

    console.log('Attempting to fetch Gmail messages...')
    
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
    
    const responseText = await gmailResponse.text()
    
    // Log Gmail API error details if any
    if (!gmailResponse.ok) {
      console.error('Gmail API error details:', {
        status: gmailResponse.status,
        statusText: gmailResponse.statusText,
        response: responseText
      })
      
      // Try to parse error response
      try {
        const errorData = JSON.parse(responseText)
        throw new Error(`Gmail API error: ${errorData.error?.message || responseText}`)
      } catch (e) {
        throw new Error(`Gmail API error (${gmailResponse.status}): ${responseText}`)
      }
    }

    // Parse Gmail API response
    let data;
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse Gmail API response:', responseText)
      throw new Error('Invalid response from Gmail API')
    }

    const { messages } = data
    console.log(`Found ${messages?.length || 0} messages`)

    if (!messages || !Array.isArray(messages)) {
      console.error('No messages array in response:', data)
      throw new Error('No messages found in Gmail response')
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
        subject: msg.payload.headers.find((h: {name: string}) => h.name.toLowerCase() === 'subject')?.value || 'No Subject',
        from: msg.payload.headers.find((h: {name: string}) => h.name.toLowerCase() === 'from')?.value || 'Unknown',
        date: msg.payload.headers.find((h: {name: string}) => h.name.toLowerCase() === 'date')?.value,
        snippet: msg.snippet,
      }))

    console.log(`Successfully processed ${formattedEmails.length} emails`)

    return new Response(
      JSON.stringify({ emails: formattedEmails }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in fetch-gmail function:', error)
    
    // Return a more detailed error response
    return new Response(
      JSON.stringify({
        error: error.message,
        detail: 'Failed to fetch Gmail messages. Please check the function logs for more details.',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})