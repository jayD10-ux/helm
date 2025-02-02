import { Bell, Mail, MessageSquare, Github } from "lucide-react";
import { Card } from "@/components/ui/card";

const NotificationPanel = () => {
  const notifications = [
    {
      id: 1,
      title: "New Email",
      message: "Connect Gmail to see your latest emails",
      icon: Mail,
      time: "Just now",
      type: "gmail"
    },
    {
      id: 2,
      title: "Slack Updates",
      message: "Connect Slack to see your messages",
      icon: MessageSquare,
      time: "5m ago",
      type: "slack"
    },
    {
      id: 3,
      title: "GitHub Activity",
      message: "Connect GitHub to track repository updates",
      icon: Github,
      time: "10m ago",
      type: "github"
    }
  ];

  return (
    <div className="h-full w-full p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <Bell className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="space-y-4">
        {notifications.map((notification) => (
          <Card key={notification.id} className="p-4 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start space-x-4">
              <div className="mt-1">
                <notification.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">{notification.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {notification.message}
                </p>
                <span className="text-xs text-muted-foreground mt-2 block">
                  {notification.time}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NotificationPanel;