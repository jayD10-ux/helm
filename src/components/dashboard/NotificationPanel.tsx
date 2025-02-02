import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";

const NotificationPanel = () => {
  return (
    <div className="h-full w-full p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <Bell className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start space-x-4">
              <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
              <div className="flex-1">
                <h3 className="font-medium mb-1">Notification Title</h3>
                <p className="text-sm text-muted-foreground">
                  This is a placeholder notification message that will be replaced with real content.
                </p>
                <span className="text-xs text-muted-foreground mt-2 block">
                  2 hours ago
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