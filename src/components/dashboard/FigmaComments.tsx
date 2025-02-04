import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { MessageSquare, Loader, FileIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useIntegration } from "./useIntegration";

interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
  comments: FigmaComment[];
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

const FigmaComments = () => {
  const { data: integration, isLoading: isLoadingIntegration } = useIntegration('figma');

  const { data: figmaData, isLoading } = useQuery({
    queryKey: ['figma-data'],
    queryFn: async () => {
      if (!integration?.merge_account_token) {
        throw new Error('No Figma integration found');
      }

      console.log('Fetching Figma data...');
      const { data, error } = await supabase.functions.invoke('fetch-figma');
      if (error) {
        console.error('Error fetching Figma data:', error);
        throw error;
      }
      console.log('Figma data:', data);
      return data as { files: FigmaFile[] };
    },
    enabled: !!integration?.merge_account_token
  });

  if (isLoadingIntegration || isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!integration?.merge_account_token) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Connect your Figma account to see comments</p>
        </div>
      </Card>
    );
  }

  if (!figmaData?.files?.length) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No Figma files found</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {figmaData.files.map((file) => (
        <Card key={file.key} className="p-4">
          <div className="flex items-start space-x-4 mb-4">
            {file.thumbnail_url ? (
              <img
                src={file.thumbnail_url}
                alt={file.name}
                className="w-16 h-16 rounded object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                <FileIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{file.name}</h3>
                <a
                  href={`https://www.figma.com/file/${file.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center space-x-1"
                >
                  <span>Open in Figma</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground">
                Last modified: {format(new Date(file.last_modified), 'PPP')}
              </p>
            </div>
          </div>

          {file.comments.length > 0 ? (
            <div className="space-y-3">
              {file.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="pl-4 border-l-2 border-muted-foreground/20"
                >
                  <p className="text-sm">{comment.message}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), 'PPp')}
                    </span>
                    {comment.resolved && (
                      <span className="text-xs text-green-500">Resolved</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No comments in this file
            </p>
          )}
        </Card>
      ))}
    </div>
  );
};

export default FigmaComments;