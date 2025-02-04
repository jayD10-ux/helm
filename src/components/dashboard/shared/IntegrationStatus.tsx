import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { IntegrationError } from "@/types/integration";

interface IntegrationStatusProps {
  isLoading: boolean;
  error: IntegrationError | null;
  icon: React.ElementType;
  title: string;
  onDisconnect?: () => void;
}

export const IntegrationStatus = ({
  isLoading,
  error,
  icon: Icon,
  title,
  onDisconnect
}: IntegrationStatusProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 bg-destructive/10">
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-destructive">{error.message}</p>
          {onDisconnect && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onDisconnect}
              className="w-fit"
            >
              Disconnect {title}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return null;
};