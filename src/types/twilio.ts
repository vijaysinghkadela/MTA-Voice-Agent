export interface TwilioMediaEvent {
  event: 'media';
  sequenceNumber: string;
  media: {
    track: 'inbound' | 'outbound';
    chunk: string;
    timestamp: string;
    payload: string; // base64 mulaw 8kHz
  };
  streamSid: string;
}

export interface TwilioStartEvent {
  event: 'start';
  sequenceNumber: string;
  streamSid: string;
  start: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    customParameters?: Record<string, string>;
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
}

export interface TwilioStopEvent {
  event: 'stop';
  sequenceNumber: string;
  streamSid: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
}

export interface TwilioMarkEvent {
  event: 'mark';
  sequenceNumber: string;
  streamSid: string;
  mark: { name: string };
}

export type TwilioStreamEvent =
  | TwilioMediaEvent
  | TwilioStartEvent
  | TwilioStopEvent
  | TwilioMarkEvent
  | { event: string };

// Status callback from Twilio (POST)
export interface TwilioStatusCallback {
  CallSid: string;
  CallStatus: 'completed' | 'no-answer' | 'busy' | 'failed' | 'canceled';
  CallDuration: string; // seconds as string
  From: string;
  To: string;
  Direction: string;
  Timestamp: string;
  AccountSid: string;
}
