import type { WebSocket } from 'ws';
import type {
  TelephonyStreamEvent,
  StreamStartEvent,
  StreamMediaEvent,
  StreamStopEvent,
} from '../types/telephony.js';
import { createSession, sendAudioToGemini, closeSession } from '../services/gemini-live.service.js';
import { processCallEnd } from './call-status.handler.js';

export function handleMediaStream(ws: WebSocket): void {
  let callSid: string | null = null;

  ws.on('message', async (raw: Buffer) => {
    let event: TelephonyStreamEvent;
    try {
      event = JSON.parse(raw.toString()) as TelephonyStreamEvent;
    } catch {
      return;
    }

    switch (event.event) {
      case 'start': {
        const e = event as StreamStartEvent;
        callSid = e.start.callSid;
        const callerPhone = e.start.customParameters?.From ?? e.start.customParameters?.callSid ?? 'Unknown';
        console.log(`🎬 Stream start [${callSid}]`);
        try {
          await createSession(callSid, e.streamSid, callerPhone, ws);
        } catch (err) {
          console.error(`❌ Session create failed [${callSid}]:`, err);
          ws.close();
        }
        break;
      }

      case 'media': {
        const e = event as StreamMediaEvent;
        if (!callSid || e.media.track !== 'inbound') return;
        sendAudioToGemini(callSid, e.media.payload);
        break;
      }

      case 'stop': {
        const e = event as StreamStopEvent;
        const sid = e.stop.callSid ?? callSid;
        if (!sid) return;
        const session = closeSession(sid);
        if (session) processCallEnd(session).catch(console.error);
        ws.close();
        break;
      }
    }
  });

  ws.on('close', () => {
    if (callSid) {
      const session = closeSession(callSid);
      if (session) processCallEnd(session).catch(() => {});
    }
  });

  ws.on('error', (err) => console.error(`WS error [${callSid}]:`, err.message));
}
