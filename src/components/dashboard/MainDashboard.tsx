import { BarChart, Users, DollarSign, Calendar, Github, Mail, MessageSquare, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const MainDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const stats = [
    { title: "Revenue", value: "$24,000", icon: DollarSign, change: "+12%" },
    { title: "Active Users", value: "1,200", icon: Users, change: "+8%" },
    { title: "Projects", value: "32", icon: Github, change: "+24%" },
    { title: "Growth", value: "18%", icon: BarChart, change: "+2%" },
  ];

  const integrations = [
    { title: "Gmail", icon: Mail, status: "Not Connected" },
    { title: "Slack", icon: MessageSquare, status: "Not Connected" },
    { title: "GitHub", icon: Github, status: "Not Connected" },
  ];

  const handleConnect = (service: string) => {
    toast({
      title: "Integration Required",
      description: `Please connect to ${service} to enable this feature.`,
    });
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
        {integrations.map((integration) => (
          <Card 
            key={integration.title}
            className="p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            onClick={() => handleConnect(integration.title)}
          >
            <div className="flex items-center space-x-4">
              <integration.icon className="w-6 h-6 text-muted-foreground" />
              <div>
                <h3 className="font-medium">{integration.title}</h3>
                <p className="text-sm text-muted-foreground">{integration.status}</p>
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