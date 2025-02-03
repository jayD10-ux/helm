import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader, Star, GitFork, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  html_url: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
  public_repos: number;
  followers: number;
  following: number;
}

interface GitHubData {
  user: GitHubUser;
  repositories: GitHubRepo[];
}

const GitHubPanel = () => {
  const { data: integration, isLoading: isLoadingIntegration } = useQuery({
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

  const { data: githubData, isLoading: isLoadingGithubData } = useQuery({
    queryKey: ['github-data', integration?.access_token],
    enabled: !!integration?.access_token,
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${window.location.origin}/functions/v1/fetch-github-data`, {
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub data');
      }
      
      return response.json() as Promise<GitHubData>;
    }
  });

  if (isLoadingIntegration || isLoadingGithubData) {
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

  if (!githubData) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Error loading GitHub data. Please try again later.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-4 mb-6">
        <img 
          src={githubData.user.avatar_url} 
          alt={githubData.user.login}
          className="w-12 h-12 rounded-full"
        />
        <div>
          <h3 className="font-medium">{githubData.user.name}</h3>
          <p className="text-sm text-muted-foreground">@{githubData.user.login}</p>
          <div className="flex space-x-4 mt-1 text-sm text-muted-foreground">
            <span>{githubData.user.public_repos} repos</span>
            <span>{githubData.user.followers} followers</span>
            <span>{githubData.user.following} following</span>
          </div>
        </div>
      </div>

      <h4 className="font-medium mb-4">Recent Repositories</h4>
      <div className="space-y-4">
        {githubData.repositories.map((repo) => (
          <a
            key={repo.id}
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:bg-muted p-3 rounded-lg transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <h5 className="font-medium">{repo.name}</h5>
                {repo.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {repo.description}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  {repo.stargazers_count}
                </span>
                <span className="flex items-center">
                  <GitFork className="w-4 h-4 mr-1" />
                  {repo.forks_count}
                </span>
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              Updated {formatDistanceToNow(new Date(repo.updated_at))} ago
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
};

export default GitHubPanel;