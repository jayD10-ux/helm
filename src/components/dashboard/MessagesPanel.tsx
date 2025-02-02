import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

const MessagesPanel = () => {
  return (
    <div className="h-full w-full p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Messages</h2>
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium">JD</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium">John Doe</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  This is a placeholder message that will be replaced with actual content from various sources.
                </p>
                <span className="text-xs text-muted-foreground mt-2 block">
                  5m ago
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MessagesPanel;