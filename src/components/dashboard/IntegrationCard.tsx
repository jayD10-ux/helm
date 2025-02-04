import { useState } from "react";
import { Loader } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Integration } from "@/types/integration";

interface IntegrationCardProps {
  title: string;
  provider: string;
  icon: React.ElementType;
  status: string;
  isLoading: boolean;
  isConnected: boolean;
  hasError?: boolean;
  templateUrl?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

const IntegrationCard = ({
  title,
  provider,
  icon: Icon,
  status,
  isLoading,
  isConnected,
  hasError,
  templateUrl,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleConnect = async () => {
    try {
      console.log(`Starting ${provider} OAuth connection...`);
      localStorage.setItem(`${provider}OAuthReturnTo`, window.location.pathname);
      
      const { data, error } = await supabase.functions.invoke(`get-${provider}-config`);
      
      if (error) {
        console.error(`${provider} OAuth config error:`, error);
        throw new Error(`Failed to get ${provider} configuration: ${error.message}`);
      }

      if (!data?.url) {
        console.error(`No OAuth URL returned for ${provider}`);
        throw new Error('No OAuth URL returned from server');
      }

      console.log(`Redirecting to ${provider} OAuth URL...`);
      window.location.href = data.url;
    } catch (error) {
      console.error(`${provider} connection error:`, error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : `Failed to start ${title} connection. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    if (!isConnected) return;
    
    setIsRefreshing(true);
    try {
      console.log(`Refreshing ${provider} connection...`);
      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({
        title: "Success",
        description: `${title} connection refreshed`,
      });
    } catch (error) {
      console.error(`${provider} refresh error:`, error);
      toast({
        title: "Refresh Error",
        description: error instanceof Error ? error.message : `Failed to refresh ${title} connection`,
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Icon className="w-6 h-6 text-muted-foreground" />
            <div>
              <h3 className="font-medium">{title}</h3>
              <div className="flex items-center space-x-2">
                {isLoading ? (
                  <Loader className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <p className={`text-sm ${
                    isConnected 
                      ? "text-green-500"
                      : hasError
                        ? "text-red-500"
                        : "text-muted-foreground"
                  }`}>
                    {status}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8"
              >
                <RefreshCw 
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                />
              </Button>
            )}
            {templateUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(templateUrl, '_blank')}
                className="h-8 w-8"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant={isConnected ? "outline" : "default"}
              size="sm"
              onClick={() => isConnected ? onDisconnect() : handleConnect()}
              disabled={isRefreshing}
            >
              {isConnected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default IntegrationCard;