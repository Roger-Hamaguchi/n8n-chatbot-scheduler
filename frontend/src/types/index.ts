export interface User {
  id: string; // UUID from backend
  name: string;
  email: string;
}

export interface Message {
  id: string; // generated locally
  text: string;
  sender: 'user' | 'bot' | 'system';
  timestamp: number;
}

export interface WebhookPayload {
  name: string;
  email: string;
  message: string;
}

export interface WebhookResponse {
  reply: string;
  user_id: string; // UUID returned by backend
}
