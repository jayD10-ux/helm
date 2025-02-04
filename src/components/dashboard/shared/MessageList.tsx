import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { BaseMessage } from "@/types/integration";

interface MessageListProps<T extends BaseMessage> {
  messages: T[];
  renderMessage: (message: T) => React.ReactNode;
  emptyMessage: string;
  icon: React.ElementType;
}

export function MessageList<T extends BaseMessage>({
  messages,
  renderMessage,
  emptyMessage,
  icon: Icon
}: MessageListProps<T>) {
  if (!messages?.length) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">
          <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <Card key={message.id} className="p-4 hover:shadow-lg transition-shadow duration-200">
          {renderMessage(message)}
        </Card>
      ))}
    </div>
  );
}