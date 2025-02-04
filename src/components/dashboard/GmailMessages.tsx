import { Mail, Loader, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useIntegration } from "./useIntegration";

interface GmailMessage {
  id: string;
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
    data: emails, 
    isLoading: isLoadingEmails,
    error: emailError,
    refetch: refetchEmails
  } = useQuery({
    queryKey: ['gmail-messages'],
    queryFn: async () => {
      if (!integration?.merge_account_token) {
        throw new Error('No Gmail integration found');
      }

      const { data, error } = await supabase.functions.invoke('fetch-gmail');
      if (error) throw error;
      return data.emails as GmailMessage[];
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
      await refetchEmails();
      toast({
        title: "Success",
        description: "Emails refreshed successfully",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh emails",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoadingIntegration || isLoadingEmails) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!integration?.merge_account_token) {
    return (
      <Card className="p-4">
        <div className="flex items-start space-x-4">
          <Mail className="w-5 h-5 text-muted-foreground mt-1" />
          <div className="flex-1">
            <h3 className="font-medium">Gmail</h3>
            <p className="text-sm text-muted-foreground">
              Connect your Gmail account to see your emails here
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (emailError) {
    return (
      <Card className="p-4 bg-destructive/10">
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-destructive">
            {emailError instanceof Error ? emailError.message : "Failed to load emails"}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDisconnect}
            className="w-fit"
          >
            Disconnect Gmail
          </Button>
        </div>
      </Card>
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

      {emails?.map((email) => (
        <Card key={email.id} className="p-4 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-start space-x-4">
            <Mail className="w-5 h-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-medium line-clamp-1">{email.subject}</h3>
                {email.date && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(email.date), 'MMM d')}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-1">{email.from}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {email.snippet}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default GmailMessages;