export interface Integration {
  id: string;
  user_id: string;
  provider: string;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
  template_id: string | null;
  merge_account_token: string | null;
  merge_account_id: string | null;
}

export interface IntegrationError {
  message: string;
  details?: string;
}

export type IntegrationProvider = 'github' | 'slack' | 'google' | 'figma';

export interface IntegrationStatus {
  isConnected: boolean;
  isLoading: boolean;
  error: IntegrationError | null;
}

export interface BaseMessage {
  id: string;
  created_at: string;
}

export interface IntegrationCardProps {
  title: string;
  provider: IntegrationProvider;
  icon: React.ElementType;
  templateUrl?: string;
}