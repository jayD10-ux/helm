import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader } from "lucide-react";

const GitHubPanel = () => {
  const { data: integration, isLoading } = useQuery({
    queryKey: ['github-integration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', 'github')
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching GitHub integration:', error);
        throw error;
      }
      
      return data;
    }
  });

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin" />
      </Card>
    );
  }

  if (!integration) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          No GitHub data available. Please connect your GitHub account.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-medium mb-4">GitHub Activity</h3>
      {/* We'll add GitHub activity data here in future updates */}
      <p className="text-muted-foreground">
        GitHub account connected successfully. Activity data coming soon.
      </p>
    </Card>
  );
};

export default GitHubPanel;
