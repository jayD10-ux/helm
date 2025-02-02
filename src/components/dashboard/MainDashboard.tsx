import { BarChart, Users, DollarSign, Calendar, Github, Mail, MessageSquare, LogOut, Loader } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import GitHubPanel from "./GitHubPanel";

interface Integration {
  id: string;
  provider: string;
  access_token: string | null;
}

const MainDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: integrations, isLoading: isLoadingIntegrations, refetch: refetchIntegrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*');
      
      if (error) {
        console.error('Error fetching integrations:', error);
        throw error;
      }
      
      return data as Integration[];
    }
  });

  const stats = [
    { title: "Revenue", value: "$24,000", icon: DollarSign, change: "+12%" },
    { title: "Active Users", value: "1,200", icon: Users, change: "+8%" },
    { title: "Projects", value: "32", icon: Github, change: "+24%" },
    { title: "Growth", value: "18%", icon: BarChart, change: "+2%" },
  ];

  const getIntegrationStatus = (provider: string) => {
    if (isLoadingIntegrations) return "Loading...";
    const integration = integrations?.find(i => i.provider.toLowerCase() === provider.toLowerCase());
    return integration?.access_token ? "Connected" : "Not Connected";
  };

  const handleGitHubOAuth = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      toast({
        title: "Error",
        description: "Please log in to connect GitHub.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Starting GitHub OAuth process...');
      
      const { data: configData, error: configError } = await supabase.functions.invoke('get-github-config');
      
      if (configError) {
        console.error('GitHub config error:', configError);
        toast({
          title: "Configuration Error",
          description: "Failed to get GitHub configuration. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (!configData?.clientId || !configData?.redirectUri) {
        console.error('Invalid config data:', configData);
        toast({
          title: "Configuration Error",
          description: "Invalid GitHub configuration. Please check the setup.",
          variant: "destructive",
        });
        return;
      }

      // Store the current URL in localStorage
      const returnUrl = window.location.href;
      console.log('Setting return URL:', returnUrl);
      localStorage.setItem('githubOAuthReturnTo', returnUrl);

      // Construct the GitHub OAuth URL
      const scope = 'repo user';
      const authUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${configData.clientId}&` +
        `redirect_uri=${encodeURIComponent(configData.redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}`;
      
      console.log('Full GitHub auth URL:', authUrl);
      window.location.href = authUrl;

    } catch (error) {
      console.error('GitHub OAuth setup error:', error);
      toast({
        title: "Error",
        description: "Failed to initialize GitHub connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleOAuth = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      toast({
        title: "Error",
        description: "Please log in to connect Gmail.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Starting Google OAuth process...');
      
      const { data: configData, error: configError } = await supabase.functions.invoke('get-google-config');
      
      if (configError) {
        console.error('Google config error:', configError);
        toast({
          title: "Configuration Error",
          description: "Failed to get Google configuration. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (!configData?.clientId || !configData?.redirectUri) {
        console.error('Invalid config data:', configData);
        toast({
          title: "Configuration Error",
          description: "Invalid Google configuration. Please check the setup.",
          variant: "destructive",
        });
        return;
      }

      // Store the current URL in localStorage
      const returnUrl = window.location.href;
      console.log('Setting return URL:', returnUrl);
      localStorage.setItem('googleOAuthReturnTo', returnUrl);

      // Construct the Google OAuth URL with state parameter
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${configData.clientId}&` +
        `redirect_uri=${encodeURIComponent(configData.redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(configData.scopes)}&` +
        `access_type=offline&` +
        `state=google&` +
        `prompt=consent`;
      
      console.log('Full Google auth URL:', authUrl);
      window.location.href = authUrl;

    } catch (error) {
      console.error('Google OAuth setup error:', error);
      toast({
        title: "Error",
        description: "Failed to initialize Google connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConnect = async (service: string) => {
    switch (service.toLowerCase()) {
      case 'gmail':
        await handleGoogleOAuth();
        break;
      case 'github':
        await handleGitHubOAuth();
        break;
      default:
        toast({
          title: "Coming Soon",
          description: `${service} integration will be available soon.`,
        });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const integrationsList = [
    { title: "Gmail", icon: Mail, provider: "gmail" },
    { title: "Slack", icon: MessageSquare, provider: "slack" },
    { title: "GitHub", icon: Github, provider: "github" },
  ];

  return (
    <div className="h-full w-full p-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button onClick={handleLogout} variant="outline" size="sm">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-semibold mt-1">{stat.value}</h3>
                <span className="text-xs text-green-500 mt-1 block">{stat.change}</span>
              </div>
              <stat.icon className="w-8 h-8 text-muted-foreground opacity-75" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Integrations</h2>
          <div className="grid grid-cols-1 gap-4">
            {integrationsList.map((integration) => (
              <Card 
                key={integration.title}
                className="p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                onClick={() => handleConnect(integration.title)}
              >
                <div className="flex items-center space-x-4">
                  <integration.icon className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{integration.title}</h3>
                    <div className="flex items-center space-x-2">
                      {isLoadingIntegrations ? (
                        <Loader className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <p className={`text-sm ${
                          getIntegrationStatus(integration.provider) === "Connected" 
                            ? "text-green-500" 
                            : "text-muted-foreground"
                        }`}>
                          {getIntegrationStatus(integration.provider)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">GitHub Activity</h2>
          <GitHubPanel />
        </div>
      </div>

      <Card className="p-6 h-[300px] flex items-center justify-center text-muted-foreground">
        Activity Timeline (Coming Soon)
      </Card>
    </div>
  );
};

export default MainDashboard;