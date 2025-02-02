import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader, GitFork, Star, Book, Users } from "lucide-react";

interface GitHubData {
  public_repos: number;
  followers: number;
  following: number;
  public_gists: number;
  name: string;
  login: string;
}

const GitHubPanel = () => {
  const { data: integration, isLoading: isLoadingIntegration } = useQuery({
    queryKey: ['github-integration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', 'github')
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: githubData, isLoading: isLoadingGithub } = useQuery({
    queryKey: ['github-data', integration?.access_token],
    queryFn: async () => {
      if (!integration?.access_token) throw new Error('No GitHub token found');
      
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub data');
      }
      
      return response.json() as Promise<GitHubData>;
    },
    enabled: !!integration?.access_token,
  });

  if (isLoadingIntegration || isLoadingGithub) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[200px]">
          <Loader className="w-6 h-6 animate-spin" />
        </div>
      </Card>
    );
  }

  if (!integration?.access_token) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          Connect GitHub to see your statistics
        </div>
      </Card>
    );
  }

  if (!githubData) return null;

  const stats = [
    { label: 'Repositories', value: githubData.public_repos, icon: Book },
    { label: 'Followers', value: githubData.followers, icon: Users },
    { label: 'Following', value: githubData.following, icon: Users },
    { label: 'Gists', value: githubData.public_gists, icon: GitFork },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">GitHub Overview</h3>
      <div className="text-sm text-muted-foreground mb-4">
        {githubData.name} (@{githubData.login})
      </div>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center space-x-2">
            <stat.icon className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{stat.label}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GitHubPanel;