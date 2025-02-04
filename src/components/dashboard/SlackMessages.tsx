import { MessageSquare, Loader, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface SlackMessage {
  id: string;
  text: string;
  user: string;
  timestamp: string;
  channel: string;
}

const SlackMessages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: integration, isLoading: isLoadingIntegration } = useQuery({
    queryKey: ['integrations', 'slack'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', 'slack')
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { 
    data: messages, 
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['slack-messages'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-slack');
      if (error) throw error;
      return data.messages as SlackMessage[];
    },
    enabled: !!integration?.access_token
  });

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('provider', 'slack');

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      await queryClient.invalidateQueries({ queryKey: ['slack-messages'] });

      toast({
        title: "Success",
        description: "Slack disconnected successfully",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Slack",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchMessages();
      toast({
        title: "Success",
        description: "Messages refreshed successfully",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh messages",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoadingIntegration || isLoadingMessages) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!integration?.access_token) {
    return (
      <Card className="p-4">
        <div className="flex items-start space-x-4">
          <MessageSquare className="w-5 h-5 text-muted-foreground mt-1" />
          <div className="flex-1">
            <h3 className="font-medium">Slack</h3>
            <p className="text-sm text-muted-foreground">
              Connect your Slack account to see your messages here
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (messagesError) {
    return (
      <Card className="p-4 bg-destructive/10">
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-destructive">
            {messagesError instanceof Error ? messagesError.message : "Failed to load messages"}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDisconnect}
            className="w-fit"
          >
            Disconnect Slack
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Slack Messages</h3>
        <div className="flex items-center space-x-2">
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </div>

      {messages?.map((message) => (
        <Card key={message.id} className="p-4 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start space-x-4">
            <MessageSquare className="w-5 h-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-medium line-clamp-1">#{message.channel}</h3>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(message.timestamp), 'MMM d, HH:mm')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">User: {message.user}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {message.text}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default SlackMessages;