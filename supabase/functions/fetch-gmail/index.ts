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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the session from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get the user from the session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw userError || new Error('User not found')
    }

    console.log('User authenticated:', user.id)

    // Parse and validate request body
    const requestBody = await req.json()
    console.log('Request body received:', requestBody)

    if (!requestBody || typeof requestBody !== 'object') {
      throw new Error('Invalid request body format')
    }

    const { access_token } = requestBody
    
    if (!access_token) {
      console.error('Missing access_token in request body')
      throw new Error('No access token provided')
    }

    // Prepare headers for Google API requests
    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'Accept': 'application/json',
    }

    // Fetch Gmail messages
    console.log('Fetching Gmail messages...')
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10',
      { headers }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gmail API error:', {
        status: response.status,
        text: errorText
      })
      throw new Error(`Failed to fetch Gmail messages (${response.status}): ${errorText}`)
    }

    const { messages } = await response.json()
    console.log(`Found ${messages?.length || 0} messages`)

    // Fetch details for each message
    const messageDetails = await Promise.all(
      messages.map(async (msg: { id: string }) => {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          { headers }
        )

        if (!msgResponse.ok) {
          console.error(`Error fetching message ${msg.id}:`, await msgResponse.text())
          return null
        }

        return await msgResponse.json()
      })
    )

    // Filter out any failed message fetches and format the data
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
    return new Response(
      JSON.stringify({
        error: error.message,
        detail: 'Please check the logs and try reconnecting your Gmail account.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})