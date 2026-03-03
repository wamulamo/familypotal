export type ProfileRole = "michi" | "papa" | "mama";
export type MessageRole = "michi" | "papa" | "mama" | "ai";

export interface Profile {
  id: string;
  role: ProfileRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Thread {
  id: string;
  created_at: string;
}

export type MessageChannel = "dennnon" | "ai";

export interface Message {
  id: string;
  thread_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  channel?: MessageChannel;
}

export interface BoardRead {
  id: string;
  message_id: string;
  reader_role: ProfileRole;
  created_at: string;
}

export interface ChatSettings {
  id: string;
  thread_id: string | null;
  system_prompt: string;
  ng_words: string[];
  semantic_filter_prompt: string;
  created_at: string;
  updated_at: string;
}
