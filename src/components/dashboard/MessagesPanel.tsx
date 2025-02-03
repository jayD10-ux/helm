import { MessageSquare } from "lucide-react";
import GmailMessages from "./GmailMessages";
import SlackMessages from "./SlackMessages";

const MessagesPanel = () => {
  return (
    <div className="h-full w-full p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Messages</h2>
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="space-y-6">
        <GmailMessages />
        <SlackMessages />
      </div>
    </div>
  );
};

export default MessagesPanel;