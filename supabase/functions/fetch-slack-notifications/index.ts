import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.2.1";

const MERGE_API_KEY = Deno.env.get('MERGE_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  sender_name: string;
  message_content: string;
  timestamp: string;
  channel_name: string;
}

async function analyzeMessage(message: string) {
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
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return JSON.parse(response.data.choices[0].message.content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching messages from Merge API...');
    
    const response = await fetch('https://api.merge.dev/api/ticketing/messages', {
      headers: {
        'Authorization': `Bearer ${MERGE_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Merge API error: ${response.statusText}`);
    }

    const data = await response.json();
    const messages = data.results || [];

    console.log(`Processing ${messages.length} messages...`);

    const processedMessages = await Promise.all(
      messages
        .filter((msg: any) => !msg.is_bot_message)
        .map(async (msg: any) => {
          const analysis = await analyzeMessage(msg.message_content);
          
          return {
            priority: analysis.urgency,
            sender: msg.sender_name,
            message: msg.message_content,
            channel: msg.channel_name,
            time: new Date(msg.timestamp).toISOString(),
            sentiment: analysis.sentiment,
            topic: analysis.topic,
          };
        })
    );

    return new Response(
      JSON.stringify({ notifications: processedMessages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in fetch-slack-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});