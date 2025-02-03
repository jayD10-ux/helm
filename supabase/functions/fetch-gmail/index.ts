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

    console.log('Starting Gmail API request with access token');

    // First, validate the token by making a simple userinfo request
    const validateResponse = await fetch(
      'https://www.googleapis.com/oauth2/v1/userinfo',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        }
      }
    );

    if (!validateResponse.ok) {
      console.error('Token validation failed:', await validateResponse.text());
      throw new Error('Invalid or expired access token');
    }

    console.log('Access token validated successfully');

    // Fetch Gmail messages with detailed error logging
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
    console.log('Gmail API Response Status:', response.status);
    console.log('Gmail API Response Headers:', Object.fromEntries(response.headers));
    console.log('Gmail API Response Body:', responseText);

    if (!response.ok) {
      let errorMessage = 'Failed to fetch Gmail messages';
      try {
        const errorData = JSON.parse(responseText);
        console.error('Gmail API error details:', errorData);
        
        if (errorData.error?.code === 403) {
          errorMessage = 'Access denied. Please ensure Gmail access is enabled for your Google account.';
        } else if (errorData.error?.code === 401) {
          errorMessage = 'Authentication failed. Please reconnect your Gmail account.';
        }
        
        throw new Error(errorMessage);
      } catch (e) {
        console.error('Error parsing Gmail API error response:', e);
        throw new Error(errorMessage);
      }
    }

    // Parse the successful response
    const { messages } = JSON.parse(responseText);
    console.log(`Found ${messages?.length || 0} messages`);

    // Fetch details for each message with improved error handling
    const messageDetails = await Promise.all(
      messages.map(async (msg: { id: string }) => {
        console.log(`Fetching details for message ${msg.id}`);
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

        const messageData = await msgResponse.json();
        console.log(`Successfully fetched details for message ${msg.id}`);
        return messageData;
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
        detail: 'If this error persists, please try disconnecting and reconnecting your Gmail account with full access permissions.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});