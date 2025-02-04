import { Bell, Mail, MessageSquare, Github, Paintbrush, AlertTriangle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Notification {
  priority: string;
  sender: string;
  message: string;
  channel: string;
  time: string;
  sentiment: string;
  topic: string;
}

const NotificationPanel = () => {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['slack-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-slack-notifications');
      if (error) throw error;
      return data.notifications as Notification[];
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  return (
    <div className="h-full w-full p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <Bell className="w-5 h-5 text-muted-foreground" />
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Clock className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {notifications?.map((notification, index) => (
            <Card key={index} className="p-4 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start space-x-4">
                <div className="mt-1">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{notification.sender}</h3>
                      <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                        {notification.priority}
                      </Badge>
                      <span className="text-lg">{getSentimentIcon(notification.sentiment)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(notification.time), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      #{notification.channel}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {notification.topic}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;