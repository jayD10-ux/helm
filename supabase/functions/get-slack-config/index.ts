import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MERGE_API_KEY = Deno.env.get('MERGE_API_KEY')!;
const MAX_RETRIES = 3;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

// Exponential backoff retry logic
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  attempt = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      console.error(`Failed after ${MAX_RETRIES} attempts:`, error);
      throw error;
    }

    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
    console.log(`Retry attempt ${attempt} after ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(operation, attempt + 1);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Slack OAuth configuration process...');

    // Validate MERGE_API_KEY
    if (!MERGE_API_KEY) {
      console.error('Missing MERGE_API_KEY environment variable');
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          message: 'Merge.dev API key not configured',
          details: 'Please configure MERGE_API_KEY in Supabase Edge Function secrets'
        }),
        {
          headers: corsHeaders,
          status: 500,
        }
      );
    }

    // Create Supabase client to get user session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
    
    if (sessionError || !session?.user?.email) {
      console.error('Session error:', sessionError);
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: 'Please sign in to continue',
          details: sessionError?.message
        }),
        {
          headers: corsHeaders,
          status: 401,
        }
      );
    }

    console.log('User authenticated, email:', session.user.email);

    // Prepare request to Merge.dev
    const origin = req.headers.get('origin') || '';
    const requestBody = {
      end_user_origin: origin,
      end_user_email_address: session.user.email,
      categories: ['communication'],
      integration: 'slack',
    };

    console.log('Requesting link token from Merge.dev with params:', requestBody);

    // Get the OAuth URL from Merge.dev with retry logic
    const response = await retryWithBackoff(async () => {
      const res = await fetch('https://api.merge.dev/api/integrations/slack/link-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MERGE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Log response details for debugging
      console.log('Merge.dev response status:', res.status);
      console.log('Merge.dev response headers:', Object.fromEntries(res.headers.entries()));
      
      const responseText = await res.text();
      console.log('Merge.dev raw response:', responseText);

      // Parse response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse Merge.dev response:', responseText);
        throw new Error('Invalid response from authentication service');
      }

      // Handle specific error cases
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Invalid Merge.dev API key');
        } else if (res.status === 400) {
          throw new Error(data.error || 'Invalid request parameters');
        } else if (res.status >= 500) {
          throw new Error('Merge.dev service is currently unavailable');
        }
        throw new Error(data.error || 'Failed to get Slack configuration');
      }

      return { response: res, data };
    });

    if (!response.data.link_token) {
      console.error('No link token in response:', response.data);
      return new Response(
        JSON.stringify({
          error: 'Invalid response',
          message: 'No authentication URL received',
          details: response.data
        }),
        {
          headers: corsHeaders,
          status: 502,
        }
      );
    }

    console.log('Successfully received link token');

    return new Response(
      JSON.stringify({ url: response.data.link_token }),
      { 
        headers: corsHeaders,
        status: 200,
      }
    );

  } catch (error) {
    console.error('Unexpected error in get-slack-config:', error);
    
    // Determine appropriate error message based on error type
    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Invalid API key configuration';
        statusCode = 401;
      } else if (error.message.includes('parameters')) {
        errorMessage = 'Invalid request parameters';
        statusCode = 400;
      } else if (error.message.includes('unavailable')) {
        errorMessage = 'Service temporarily unavailable';
        statusCode = 503;
      }
    }
    
    return new Response(
      JSON.stringify({
        error: 'Integration error',
        message: errorMessage,
        details: error instanceof Error ? error.message : undefined
      }),
      {
        headers: corsHeaders,
        status: statusCode,
      }
    );
  }
});