import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { IntegrationError } from "@/types/integration";

export interface IntegrationStatusProps {
  isLoading: boolean;
  error: IntegrationError | null;
  icon: React.ElementType;
  title: string;
  description?: string;
  onDisconnect?: () => void;
}

export const IntegrationStatus = ({
  isLoading,
  error,
  icon: Icon,
  title,
  description,
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

  if (description) {
    return (
      <Card className="p-4">
        <div className="flex items-start space-x-4">
          <Icon className="w-5 h-5 text-muted-foreground mt-1" />
          <div className="flex-1">
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}