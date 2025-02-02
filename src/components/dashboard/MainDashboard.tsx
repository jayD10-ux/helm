import { BarChart, Users, DollarSign, Calendar, Github, Mail, MessageSquare, LogOut, Loader } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

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

    const redirectUri = `${window.location.origin}/oauth-callback.html`;
    const scope = 'repo user';
    
    try {
      console.log('Fetching GitHub config...');
      const { data: configData, error: configError } = await supabase.functions.invoke('get-github-config');
      
      if (configError) {
        console.error('GitHub config error:', configError);
        throw new Error('Failed to get GitHub configuration');
      }

      console.log('Config received:', configData);
      
      if (!configData.clientId) {
        throw new Error('GitHub Client ID not found in configuration');
      }

      const authUrl = `https://github.com/login/oauth/authorize?client_id=${configData.clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
      console.log('Auth URL:', authUrl);
      
      // Open GitHub OAuth in a popup
      const popup = window.open(authUrl, 'github-oauth', 'width=600,height=800');
      
      if (!popup) {
        throw new Error('Failed to open popup window. Please allow popups for this site.');
      }

      // Listen for the OAuth callback
      window.addEventListener('message', async (event) => {
        console.log('Received message:', event.origin, window.location.origin);
        
        if (event.origin !== window.location.origin) {
          console.log('Origin mismatch, ignoring message');
          return;
        }
        
        if (event.data.type === 'github-oauth') {
          console.log('Received GitHub OAuth callback');
          const { code } = event.data;
          
          if (!code) {
            console.error('No code received from GitHub');
            throw new Error('No authorization code received from GitHub');
          }

          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;

            console.log('Exchanging code for token...');
            const response = await supabase.functions.invoke('github-oauth', {
              body: { code },
            });

            console.log('Token exchange response:', response);

            if (response.error) {
              throw new Error(response.error.message || 'Failed to connect to GitHub');
            }

            await refetchIntegrations();
            
            toast({
              title: "Success",
              description: "Successfully connected to GitHub",
            });
          } catch (error) {
            console.error('GitHub OAuth error:', error);
            toast({
              title: "Error",
              description: "Failed to connect to GitHub. Please try again.",
              variant: "destructive",
            });
          } finally {
            popup?.close();
          }
        }
      });
    } catch (error) {
      console.error('GitHub OAuth setup error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to initialize GitHub connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConnect = async (service: string) => {
    switch (service.toLowerCase()) {
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

      <h2 className="text-xl font-semibold mb-4">Integrations</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

      <Card className="p-6 h-[300px] flex items-center justify-center text-muted-foreground">
        Activity Timeline (Coming Soon)
      </Card>
    </div>
  );
};

export default MainDashboard;
