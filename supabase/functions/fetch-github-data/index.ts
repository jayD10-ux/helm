import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Edge Function: fetch-github-data loaded')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  })

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting GitHub data fetch process...')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    console.log('Supabase configuration:', {
      urlPresent: !!supabaseUrl,
      keyPresent: !!supabaseKey
    })
    
    const supabase = createClient(
      supabaseUrl ?? '',
      supabaseKey ?? ''
    )

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('No authorization header provided')
      throw new Error('No authorization header provided')
    }
    
    console.log('Authenticating user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (userError) {
      console.error('User authentication error:', userError)
      throw userError
    }
    
    if (!user) {
      console.error('No user found')
      throw new Error('No user found')
    }
    
    console.log('User authenticated:', user.id)

    // Get the GitHub integration for this user
    console.log('Fetching GitHub integration...')
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'github')
      .eq('user_id', user.id)
      .maybeSingle()

    if (integrationError) {
      console.error('Integration fetch error:', integrationError)
      throw integrationError
    }
    
    if (!integration?.access_token) {
      console.error('No GitHub access token found')
      throw new Error('No GitHub access token found')
    }
    
    console.log('GitHub integration found with access token')

    // Fetch GitHub user data
    console.log('Fetching GitHub user data...')
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase Edge Function'
      }
    })
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('GitHub user API error:', errorText)
      throw new Error(`GitHub API error: ${errorText}`)
    }
    
    const userData = await userResponse.json()
    console.log('GitHub user data fetched successfully:', {
      login: userData.login,
      id: userData.id
    })

    // Fetch recent repositories
    console.log('Fetching GitHub repositories...')
    const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=5', {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase Edge Function'
      }
    })
    
    if (!reposResponse.ok) {
      const errorText = await reposResponse.text()
      console.error('GitHub repos API error:', errorText)
      throw new Error(`GitHub API error: ${errorText}`)
    }
    
    const reposData = await reposResponse.json()
    console.log('GitHub repos data fetched successfully:', {
      count: reposData.length
    })

    // Return the combined data
    const response = {
      user: userData,
      repositories: reposData
    }
    
    console.log('Returning successful response')
    
    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Function error:', {
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Ensure we always return a JSON response, even for errors
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        },
        status: 400
      }
    )
  }
})