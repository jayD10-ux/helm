import { MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GmailMessages from "./messages/GmailMessages";
import SlackMessages from "./messages/SlackMessages";
import FigmaComments from "./messages/FigmaComments";
import { Integration } from "@/types/integration";

const MessagesPanel = () => {
  const { data: integrations } = useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  const hasIntegration = (provider: string) => 
    integrations?.some(i => i.provider === provider && i.merge_account_token);

  return (
    <div className="h-full w-full p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Messages</h2>
        <MessageCircle className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="space-y-6">
        {hasIntegration('google') && (
          <div>
            <h3 className="text-lg font-medium mb-3">Gmail</h3>
            <GmailMessages />
          </div>
        )}
        {hasIntegration('slack') && (
          <div>
            <h3 className="text-lg font-medium mb-3">Slack</h3>
            <SlackMessages />
          </div>
        )}
        {hasIntegration('figma') && (
          <div>
            <h3 className="text-lg font-medium mb-3">Figma Comments</h3>
            <FigmaComments />
          </div>
        )}
        {!hasIntegration('google') && !hasIntegration('slack') && !hasIntegration('figma') && (
          <div className="text-center text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No messages to display</p>
            <p className="text-sm mt-1">Connect your accounts to see messages here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPanel;