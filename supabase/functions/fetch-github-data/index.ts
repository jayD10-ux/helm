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
    console.log('Fetching GitHub data...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization')!
    console.log('Auth header present:', !!authHeader)
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (userError) {
      console.error('User auth error:', userError)
      throw userError
    }
    
    console.log('User authenticated:', user?.id)

    // Get the GitHub integration for this user
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'github')
      .eq('user_id', user?.id)
      .single()

    if (integrationError) {
      console.error('Integration fetch error:', integrationError)
      throw integrationError
    }
    
    if (!integration?.access_token) {
      console.error('No GitHub access token found')
      throw new Error('No GitHub access token found')
    }
    
    console.log('GitHub integration found')

    // Fetch GitHub user data
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('GitHub user API error:', errorText)
      throw new Error(`GitHub API error: ${errorText}`)
    }
    
    const userData = await userResponse.json()
    console.log('GitHub user data fetched')

    // Fetch recent repositories
    const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=5', {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (!reposResponse.ok) {
      const errorText = await reposResponse.text()
      console.error('GitHub repos API error:', errorText)
      throw new Error(`GitHub API error: ${errorText}`)
    }
    
    const reposData = await reposResponse.json()
    console.log('GitHub repos data fetched')

    return new Response(
      JSON.stringify({
        user: userData,
        repositories: reposData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})