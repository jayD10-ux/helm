import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.2.1";

const MERGE_API_KEY = Deno.env.get('MERGE_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

interface Message {
  sender_name: string;
  message_content: string;
  timestamp: string;
  channel_name: string;
}

async function analyzeMessage(message: string) {
  if (!OPENAI_API_KEY) {
    console.log('OpenAI API key not configured, skipping analysis');
    return {
      urgency: "Low",
      sentiment: "Neutral",
      topic: "No analysis"
    };
  }

  try {
    const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
    const openai = new OpenAIApi(configuration);

    const prompt = `
      Analyze this Slack message and provide:
      1. Urgency (Critical, High, Medium, Low)
      2. Sentiment (Positive, Neutral, Negative)
      3. Topic Summary (in 3-4 words)
      
      Message: "${message}"
      
      Respond in JSON format only:
      {
        "urgency": "",
        "sentiment": "",
        "topic": ""
      }
    `;

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.data.choices[0].message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error analyzing message:', error);
    return {
      urgency: "Low",
      sentiment: "Neutral",
      topic: "Analysis failed"
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!MERGE_API_KEY) {
      console.error('MERGE_API_KEY is not set');
      throw new Error('Missing Merge API configuration');
    }

    console.log('Fetching messages from Merge API...');
    
    const response = await fetch('https://api.merge.dev/api/ticketing/v1/messages', {
      headers: {
        'Authorization': `Bearer ${MERGE_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Merge API error response:', errorText);
      throw new Error(`Merge API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Retrieved ${data.results?.length || 0} messages from Merge API`);

    if (!data.results || !Array.isArray(data.results)) {
      console.error('Unexpected Merge API response format:', data);
      throw new Error('Invalid response format from Merge API');
    }

    const messages = data.results || [];
    console.log(`Processing ${messages.length} messages...`);

    // Process messages without waiting for analysis
    const processedMessages = messages
      .filter((msg: any) => msg && !msg.is_bot_message)
      .map((msg: any) => ({
        priority: "Low", // Default priority
        sender: msg.sender_name || 'Unknown',
        message: msg.message_content || '',
        channel: msg.channel_name || 'General',
        time: new Date(msg.timestamp || Date.now()).toISOString(),
        sentiment: "Neutral", // Default sentiment
        topic: "Pending analysis", // Default topic
      }));

    // Analyze messages in background
    if (OPENAI_API_KEY) {
      Promise.all(
        processedMessages.map(async (msg, index) => {
          try {
            const analysis = await analyzeMessage(msg.message);
            processedMessages[index] = {
              ...msg,
              priority: analysis.urgency,
              sentiment: analysis.sentiment,
              topic: analysis.topic,
            };
          } catch (error) {
            console.error('Message analysis error:', error);
            // Keep default values if analysis fails
          }
        })
      ).catch(error => {
        console.error('Background analysis error:', error);
      });
    }

    console.log(`Successfully processed ${processedMessages.length} messages`);

    return new Response(
      JSON.stringify({ notifications: processedMessages }),
      { headers: corsHeaders },
    );

  } catch (error) {
    console.error('Error in fetch-slack-notifications:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { 
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});
