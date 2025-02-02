import { MessageSquare, Mail, Github } from "lucide-react";
import { Card } from "@/components/ui/card";

const MessagesPanel = () => {
  const messages = [
    {
      id: 1,
      platform: "Gmail",
      icon: Mail,
      message: "Connect your Gmail account to see emails here",
    },
    {
      id: 2,
      platform: "Slack",
      icon: MessageSquare,
      message: "Connect Slack to see your messages and channels",
    },
    {
      id: 3,
      platform: "GitHub",
      icon: Github,
      message: "Connect GitHub to see your notifications and updates",
    }
  ];

  return (
    <div className="h-full w-full p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Messages</h2>
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="space-y-4">
        {messages.map((msg) => (
          <Card key={msg.id} className="p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <div className="flex items-start space-x-4">
              <div className="mt-1">
                <msg.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{msg.platform}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {msg.message}
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