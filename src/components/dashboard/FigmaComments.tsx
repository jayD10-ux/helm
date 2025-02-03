import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { MessageSquare, Loader } from "lucide-react";

interface FigmaComment {
  id: string;
  message: string;
  created_at: string;
  resolved: boolean;
}

const FigmaComments = () => {
  const { data: comments, isLoading } = useQuery({
    queryKey: ['figma-comments'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-figma');
      if (error) throw error;
      return data.comments as FigmaComment[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!comments?.length) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No comments yet</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <Card key={comment.id} className="p-4 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start space-x-3">
            <MessageSquare className="w-5 h-5 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm">{comment.message}</p>
              <span className="text-xs text-muted-foreground mt-1 block">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
              {comment.resolved && (
                <span className="text-xs text-green-500 mt-1 block">
                  Resolved
                </span>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default FigmaComments;