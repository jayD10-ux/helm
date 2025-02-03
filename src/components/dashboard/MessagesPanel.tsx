import { MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GmailMessages from "./GmailMessages";
import SlackMessages from "./SlackMessages";
import FigmaComments from "./FigmaComments";

const MessagesPanel = () => {
  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  const hasGmailIntegration = integrations?.some(i => i.provider === 'google' && i.webhook_url);
  const hasSlackIntegration = integrations?.some(i => i.provider === 'slack' && i.webhook_url);
  const hasFigmaIntegration = integrations?.some(i => i.provider === 'figma' && i.webhook_url);

  return (
    <div className="h-full w-full p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Messages</h2>
        <MessageCircle className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="space-y-6">
        {hasGmailIntegration && (
          <div>
            <h3 className="text-lg font-medium mb-3">Gmail</h3>
            <GmailMessages />
          </div>
        )}
        {hasSlackIntegration && (
          <div>
            <h3 className="text-lg font-medium mb-3">Slack</h3>
            <SlackMessages />
          </div>
        )}
        {hasFigmaIntegration && (
          <div>
            <h3 className="text-lg font-medium mb-3">Figma Comments</h3>
            <FigmaComments />
          </div>
        )}
        {!hasGmailIntegration && !hasSlackIntegration && !hasFigmaIntegration && (
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