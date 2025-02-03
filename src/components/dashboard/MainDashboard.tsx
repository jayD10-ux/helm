import { BarChart, Users, DollarSign, Github, Mail, MessageSquare, LogOut, Paintbrush } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import GitHubPanel from "./GitHubPanel";
import IntegrationCard from "./IntegrationCard";

interface Integration {
  id: string;
  provider: string;
  webhook_url: string | null;
  template_id: string | null;
}

const MainDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = await supabase.auth.getSession();

  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*');
      
      if (error) {
        console.error('Error fetching integrations:', error);
        throw error;
      }
      
      return data;
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
    return integration?.webhook_url ? "Connected" : "Not Connected";
  };

  const handleConnect = async (provider: string, webhookUrl: string) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .insert([
          {
            provider: provider.toLowerCase(),
            webhook_url: webhookUrl,
            user_id: session?.user?.id,
          }
        ]);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      
      toast({
        title: "Success",
        description: `${provider} connected successfully`,
      });
    } catch (error: any) {
      console.error('Connect error:', error);
      toast({
        title: "Error",
        description: `Failed to connect ${provider}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('provider', provider.toLowerCase());

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      
      toast({
        title: "Success",
        description: `${provider} disconnected successfully`,
      });
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast({
        title: "Error",
        description: `Failed to disconnect ${provider}. Please try again.`,
        variant: "destructive",
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
    { 
      title: "Gmail", 
      icon: Mail, 
      provider: "google",
      templateUrl: "https://zapier.com/apps/gmail/integrations"
    },
    { 
      title: "Slack", 
      icon: MessageSquare, 
      provider: "slack",
      templateUrl: "https://zapier.com/apps/slack/integrations"
    },
    { 
      title: "GitHub", 
      icon: Github, 
      provider: "github",
      templateUrl: "https://zapier.com/apps/github/integrations"
    },
    { 
      title: "Figma", 
      icon: Paintbrush, 
      provider: "figma",
      templateUrl: "https://zapier.com/apps/figma/integrations"
    },
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
            {integrationsList.map((integration) => {
              const status = getIntegrationStatus(integration.provider);
              const isConnected = status === "Connected";
              
              return (
                <IntegrationCard
                  key={integration.title}
                  title={integration.title}
                  provider={integration.provider}
                  icon={integration.icon}
                  status={status}
                  isLoading={isLoadingIntegrations}
                  isConnected={isConnected}
                  templateUrl={integration.templateUrl}
                  onConnect={(webhookUrl) => handleConnect(integration.provider, webhookUrl)}
                  onDisconnect={() => handleDisconnect(integration.provider)}
                />
              );
            })}
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
