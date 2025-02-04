import { MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useIntegration } from "@/hooks/useIntegration";
import { IntegrationStatus } from "@/components/shared/IntegrationStatus";
import { MessageList } from "@/components/shared/MessageList";
import { SlackMessage } from "@/types/messages";

const SlackMessages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { 
    data: integration,
    isLoading: isLoadingIntegration 
  } = useIntegration('slack');

  const { 
    data: messages, 
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['slack-messages'],
    queryFn: async () => {
      if (!integration?.merge_account_token) {
        throw new Error('No Slack integration found');
      }

      const { data, error } = await supabase.functions.invoke('fetch-slack');
      if (error) throw error;
      
      // Transform messages to include created_at
      return (data.messages as Omit<SlackMessage, 'created_at'>[]).map(message => ({
        ...message,
        created_at: message.timestamp // Use timestamp as created_at to satisfy BaseMessage
      }));
    },
    enabled: !!integration?.merge_account_token
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
    return <IntegrationStatus isLoading={true} error={null} icon={MessageSquare} title="Slack" />;
  }

  if (!integration?.merge_account_token) {
    return (
      <IntegrationStatus 
        isLoading={false}
        error={null}
        icon={MessageSquare}
        title="Slack"
        description="Connect your Slack account to see your messages here"
      />
    );
  }

  if (messagesError) {
    return (
      <IntegrationStatus 
        isLoading={false}
        error={{ message: messagesError instanceof Error ? messagesError.message : "Failed to load messages" }}
        icon={MessageSquare}
        title="Slack"
        onDisconnect={handleDisconnect}
      />
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

      <MessageList
        messages={messages || []}
        icon={MessageSquare}
        emptyMessage="No Slack messages to display"
        renderMessage={(message: SlackMessage) => (
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
        )}
      />
    </div>
  );
};

export default SlackMessages;
