export interface VapiCall {
  id: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
  type: 'inboundPhoneCall' | 'outboundPhoneCall' | 'webCall';
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  endedReason?: string;
  phoneNumber?: { id: string; number: string };
  customer?: { number: string; name?: string };
  assistant?: { id: string; name: string };
  duration?: number;
  cost?: number;
}

export interface VapiMessage {
  role: 'assistant' | 'user' | 'system' | 'function' | 'tool';
  message: string;
  time: number;
  endTime?: number;
  secondsFromStart: number;
  duration?: number;
}

export interface VapiEndOfCallReport {
  type: 'end-of-call-report';
  call: VapiCall;
  transcript: string;
  summary: string;
  messages: VapiMessage[];
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  analysis?: {
    summary?: string;
    structuredData?: Record<string, unknown>;
    successEvaluation?: string;
  };
}

export interface VapiStatusUpdate {
  type: 'status-update';
  call: VapiCall;
  status: string;
}

export type VapiWebhookPayload = VapiEndOfCallReport | VapiStatusUpdate | { type: string };
