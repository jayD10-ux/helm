import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get the session from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the user from the session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw userError || new Error('User not found');
    }

    console.log('User authenticated:', user.id);

    // Get the access token from request body
    const { access_token } = await req.json();
    if (!access_token) {
      throw new Error('No access token provided');
    }

    // Fetch Gmail messages
    console.log('Fetching Gmail messages with access token...');
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        }
      }
    );

    // Log the full response for debugging
    const responseText = await response.text();
    console.log('Gmail API Response:', responseText);

    if (!response.ok) {
      console.error('Gmail API error status:', response.status);
      console.error('Gmail API error response:', responseText);
      
      // Try to parse the error response
      let errorMessage = 'Failed to fetch Gmail messages';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorMessage;
        
        // Check for specific error types
        if (errorData.error?.status === 'PERMISSION_DENIED') {
          errorMessage = 'Insufficient permissions. Please disconnect and reconnect your Gmail account with the required permissions.';
        }
      } catch (e) {
        console.error('Error parsing Gmail API error response:', e);
      }
      
      throw new Error(errorMessage);
    }

    // Parse the successful response
    const { messages } = JSON.parse(responseText);

    // Fetch details for each message
    console.log('Fetching message details...');
    const messageDetails = await Promise.all(
      messages.map(async (msg: { id: string }) => {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Accept': 'application/json',
            }
          }
        );

        if (!msgResponse.ok) {
          console.error(`Error fetching message ${msg.id}:`, await msgResponse.text());
          return null;
        }

        return msgResponse.json();
      })
    );

    // Filter out any failed message fetches and format the data
    const formattedEmails = messageDetails
      .filter(msg => msg !== null)
      .map(msg => ({
        id: msg.id,
        subject: msg.payload.headers.find((h: {name: string}) => h.name.toLowerCase() === 'subject')?.value || 'No Subject',
        from: msg.payload.headers.find((h: {name: string}) => h.name.toLowerCase() === 'from')?.value || 'Unknown',
        date: msg.payload.headers.find((h: {name: string}) => h.name.toLowerCase() === 'date')?.value,
        snippet: msg.snippet,
      }));

    console.log(`Successfully processed ${formattedEmails.length} emails`);

    return new Response(
      JSON.stringify({ emails: formattedEmails }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fetch-gmail function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        detail: 'If this error persists, please try disconnecting and reconnecting your Gmail account.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});