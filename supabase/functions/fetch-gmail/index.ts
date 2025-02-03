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

    // Get the access token from request body
    const { access_token } = await req.json()
    if (!access_token) {
      throw new Error('No access token provided')
    }

    // Log initial token state
    console.log('Initial token state:', {
      length: access_token.length,
      firstChars: access_token.substring(0, 10) + '...',
      lastChars: '...' + access_token.substring(access_token.length - 10),
      hasBearer: access_token.toLowerCase().includes('bearer'),
      isString: typeof access_token === 'string'
    })

    // Ensure clean token without any Bearer prefix
    let cleanToken = access_token
    if (cleanToken.toLowerCase().startsWith('bearer ')) {
      console.log('Removing Bearer prefix')
      cleanToken = cleanToken.substring(7)
    }

    // Log token state after cleaning
    console.log('Token after cleaning:', {
      originalLength: access_token.length,
      cleanLength: cleanToken.length,
      firstChars: cleanToken.substring(0, 10) + '...',
      lastChars: '...' + cleanToken.substring(cleanToken.length - 10)
    })

    // Validate token format
    if (cleanToken.length < 50) {
      console.error('Token validation failed - token too short:', {
        length: cleanToken.length,
        expectedMinLength: 50
      })
      throw new Error('Token appears invalid - too short')
    }

    // Prepare headers with proper OAuth2 format
    const headers = {
      'Authorization': `Bearer ${cleanToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }

    // Validate token with userinfo endpoint
    console.log('Attempting token validation with userinfo endpoint...')
    const validateResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers }
    )

    if (!validateResponse.ok) {
      const errorText = await validateResponse.text()
      console.error('Token validation failed:', {
        status: validateResponse.status,
        statusText: validateResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(validateResponse.headers)
      })
      throw new Error(`Token validation failed: ${errorText}`)
    }

    const userInfo = await validateResponse.json()
    console.log('Token validated for email:', userInfo.email)

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
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Failed to fetch Gmail messages: ${errorText}`)
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
        detail: 'Please try disconnecting and reconnecting your Gmail account. Make sure to grant all required permissions.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})