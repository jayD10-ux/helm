import { Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useIntegration } from "@/hooks/useIntegration";
import { IntegrationStatus } from "../shared/IntegrationStatus";
import { MessageList } from "../shared/MessageList";
import { BaseMessage } from "@/types/integration";

interface GmailMessage extends BaseMessage {
  subject: string;
  from: string;
  snippet: string;
  date: string;
}

const GmailMessages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { 
    data: integration,
    isLoading: isLoadingIntegration 
  } = useIntegration('google');

  const { 
    data: messages, 
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['gmail-messages'],
    queryFn: async () => {
      if (!integration?.merge_account_token) {
        throw new Error('No Gmail integration found');
      }

      const { data, error } = await supabase.functions.invoke('fetch-gmail');
      if (error) throw error;
      
      // Transform the emails to include created_at
      return (data.emails as Omit<GmailMessage, 'created_at'>[]).map(email => ({
        ...email,
        created_at: email.date // Use date as created_at to satisfy BaseMessage
      }));
    },
    enabled: !!integration?.merge_account_token
  });

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('provider', 'google');

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      await queryClient.invalidateQueries({ queryKey: ['gmail-messages'] });

      toast({
        title: "Success",
        description: "Gmail disconnected successfully",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail",
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
    return <IntegrationStatus isLoading={true} error={null} icon={Mail} title="Gmail" />;
  }

  if (!integration?.merge_account_token) {
    return (
      <IntegrationStatus 
        isLoading={false}
        error={null}
        icon={Mail}
        title="Gmail"
        description="Connect your Gmail account to see your emails here"
      />
    );
  }

  if (messagesError) {
    return (
      <IntegrationStatus 
        isLoading={false}
        error={{ message: messagesError instanceof Error ? messagesError.message : "Failed to load messages" }}
        icon={Mail}
        title="Gmail"
        onDisconnect={handleDisconnect}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Gmail</h3>
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
        icon={Mail}
        emptyMessage="No emails to display"
        renderMessage={(message: GmailMessage) => (
          <div className="flex items-start space-x-4">
            <Mail className="w-5 h-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-medium line-clamp-1">{message.subject}</h3>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(message.date), 'MMM d')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{message.from}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {message.snippet}
              </p>
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default GmailMessages;