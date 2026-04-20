// Generic telephony WebSocket stream types
// Compatible with Exotel Passthrough API (and similar providers)

export interface StreamMediaEvent {
  event: 'media';
  sequenceNumber: string;
  streamSid: string;
  media: {
    track: 'inbound' | 'outbound';
    chunk: string;
    timestamp: string;
    payload: string; // base64 mulaw or pcm audio
  };
}

export interface StreamStartEvent {
  event: 'start';
  sequenceNumber: string;
  streamSid: string;
  start: {
    streamSid: string;
    callSid: string;
    accountSid?: string;
    tracks: string[];
    customParameters?: Record<string, string>;
    mediaFormat: {
      encoding: string;   // 'audio/x-mulaw' or 'audio/pcm'
      sampleRate: number; // typically 8000
      channels: number;
    };
  };
}

export interface StreamStopEvent {
  event: 'stop';
  sequenceNumber: string;
  streamSid: string;
  stop: {
    accountSid?: string;
    callSid: string;
  };
}

export interface StreamMarkEvent {
  event: 'mark';
  sequenceNumber: string;
  streamSid: string;
  mark: { name: string };
}

export type TelephonyStreamEvent =
  | StreamMediaEvent
  | StreamStartEvent
  | StreamStopEvent
  | StreamMarkEvent
  | { event: string };

// Status callback from Exotel (POST to /call-status)
export interface CallStatusCallback {
  CallSid: string;
  Status: 'in-progress' | 'completed' | 'no-answer' | 'busy' | 'failed';
  From: string;
  To: string;
  Duration?: string;
  RecordingUrl?: string;
}
