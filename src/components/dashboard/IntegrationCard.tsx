import { useState } from "react";
import { Loader } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IntegrationCardProps {
  title: string;
  provider: string;
  icon: React.ElementType;
  status: string;
  isLoading: boolean;
  isConnected: boolean;
  hasError?: boolean;
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
  onConnect,
  onDisconnect,
}: IntegrationCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!isConnected) return;
    
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      if (provider.toLowerCase() === 'google') {
        await queryClient.invalidateQueries({ queryKey: ['gmail-messages'] });
      }
      toast({
        title: "Success",
        description: `${title} connection refreshed`,
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error",
        description: `Failed to refresh ${title} connection`,
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
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
          <Button
            variant={isConnected ? "outline" : "default"}
            size="sm"
            onClick={() => isConnected ? onDisconnect() : onConnect()}
            disabled={isRefreshing}
          >
            {isConnected ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default IntegrationCard;