export type DetectedLanguage = 'Hindi' | 'English' | 'Hinglish' | 'Other';

export type ServiceInterest =
  | 'WhatsApp Chat Agent'
  | 'AI Voice Agent'
  | 'AI Management Dashboard'
  | 'Social Media Marketing'
  | 'Cybersecurity'
  | 'E-Commerce'
  | 'Multiple / Unsure';

export type Priority = '🔴 High' | '🟡 Medium' | '🟢 Low';

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // ms since call start
}

export interface ProcessedCallData {
  callSid: string;
  phone: string;
  clientName: string;
  businessName?: string;
  language: DetectedLanguage;
  serviceInterest: ServiceInterest;
  priority: Priority;
  budget?: string;
  timeline?: string;
  callbackTime?: string;
  howHeard?: string;
  summary: string;
  transcript: TranscriptEntry[];
  durationSec: number;
  callDate: string;
}

export interface CallLogInsert {
  call_sid: string;
  caller_phone: string;
  client_name?: string;
  business_name?: string;
  language?: string;
  service_interest?: string;
  budget?: string;
  timeline?: string;
  callback_time?: string;
  how_heard?: string;
  priority?: string;
  ai_summary?: string;
  full_transcript?: unknown;
  notion_page_id?: string;
  call_duration_sec?: number;
  call_started_at?: string;
  call_ended_at?: string;
}
