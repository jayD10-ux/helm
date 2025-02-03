import { MessageSquare, Mail, Github, Loader } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const MessagesPanel = () => {
  // Query to check if Google integration exists
  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', 'google');
      
      if (error) throw error;
      return data;
    }
  });

  // Query to fetch Gmail messages if integration exists
  const { data: emails, isLoading: isLoadingEmails, error: emailError } = useQuery({
    queryKey: ['gmail-messages'],
    queryFn: async () => {
      if (!integrations?.[0]?.access_token) {
        throw new Error('No Gmail integration found');
      }

      const { data, error } = await supabase.functions.invoke('fetch-gmail', {
        body: { access_token: integrations[0].access_token }
      });

      if (error) throw error;
      return data.emails;
    },
    enabled: !!integrations?.[0]?.access_token
  });

  const isLoading = isLoadingIntegrations || isLoadingEmails;
  const hasGmailIntegration = !!integrations?.[0]?.access_token;

  if (isLoading) {
    return (
      <div className="h-full w-full p-4 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!hasGmailIntegration) {
    return (
      <div className="h-full w-full p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Messages</h2>
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
        </div>
        <Card className="p-4 hover:shadow-lg transition-shadow duration-200">
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
      </div>
    );
  }

  if (emailError) {
    return (
      <div className="h-full w-full p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Messages</h2>
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
        </div>
        <Card className="p-4 bg-destructive/10">
          <p className="text-sm text-destructive">
            Error loading emails: {emailError.message}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Messages</h2>
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="space-y-4">
        {emails?.map((email: any) => (
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
    </div>
  );
};

export default MessagesPanel;