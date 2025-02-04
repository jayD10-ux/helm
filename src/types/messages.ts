import { BaseMessage } from "./integration";

export interface GmailMessage extends BaseMessage {
  subject: string;
  from: string;
  snippet: string;
  date: string;
}

export interface SlackMessage extends BaseMessage {
  text: string;
  user: string;
  timestamp: string;
  channel: string;
  created_at: string;
}

export interface FigmaComment extends BaseMessage {
  message: string;
  file_key: string;
  parent_id: string | null;
  resolved: boolean;
  client_meta: {
    node_id?: string;
    node_offset?: { x: number; y: number };
  };
}

export interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
  comments: FigmaComment[];
}