import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
}

interface FigmaComment {
  id: string;
  file_key: string;
  parent_id: string | null;
  message: string;
  created_at: string;
  resolved: boolean;
  client_meta: {
    node_id?: string;
    node_offset?: { x: number; y: number };
  };
}

serve(async (req) => {
  console.log('Received request to fetch Figma data');

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user ID from the authorization header
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error('Invalid session');
    }

    // Get the user's Figma integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'figma')
      .single();

    if (integrationError || !integration?.access_token) {
      throw new Error('No Figma integration found');
    }

    console.log('Fetching Figma user files...');
    
    // First, get the user's files
    const filesResponse = await fetch(
      'https://api.figma.com/v1/me/files',
      {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
        },
      }
    );

    if (!filesResponse.ok) {
      console.error('Failed to fetch Figma files:', await filesResponse.text());
      throw new Error('Failed to fetch Figma files');
    }

    const filesData = await filesResponse.json();
    const files: FigmaFile[] = filesData.files || [];

    console.log(`Found ${files.length} Figma files`);

    // For each file, fetch its comments
    const filesWithComments = await Promise.all(
      files.slice(0, 5).map(async (file) => { // Limit to 5 files to avoid rate limits
        try {
          const commentsResponse = await fetch(
            `https://api.figma.com/v1/files/${file.key}/comments`,
            {
              headers: {
                'Authorization': `Bearer ${integration.access_token}`,
              },
            }
          );

          if (!commentsResponse.ok) {
            console.error(`Failed to fetch comments for file ${file.key}:`, await commentsResponse.text());
            return {
              ...file,
              comments: [],
            };
          }

          const commentsData = await commentsResponse.json();
          return {
            ...file,
            comments: commentsData.comments || [],
          };
        } catch (error) {
          console.error(`Error fetching comments for file ${file.key}:`, error);
          return {
            ...file,
            comments: [],
          };
        }
      })
    );

    // Get file thumbnails
    const filesWithThumbnails = await Promise.all(
      filesWithComments.map(async (file) => {
        try {
          const thumbnailResponse = await fetch(
            `https://api.figma.com/v1/files/${file.key}/thumbnails`,
            {
              headers: {
                'Authorization': `Bearer ${integration.access_token}`,
              },
            }
          );

          if (!thumbnailResponse.ok) {
            return file;
          }

          const thumbnailData = await thumbnailResponse.json();
          return {
            ...file,
            thumbnail_url: thumbnailData.images?.[file.key],
          };
        } catch (error) {
          console.error(`Error fetching thumbnail for file ${file.key}:`, error);
          return file;
        }
      })
    );

    return new Response(
      JSON.stringify({
        files: filesWithThumbnails,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching Figma data:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Failed to fetch Figma data. Check Edge Function logs for details.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});