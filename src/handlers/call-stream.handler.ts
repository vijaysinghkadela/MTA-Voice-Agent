import type { WebSocket } from 'ws';
import type {
  TwilioStreamEvent,
  TwilioStartEvent,
  TwilioMediaEvent,
  TwilioStopEvent,
} from '../types/twilio.js';
import { createSession, sendAudioToGemini, closeSession } from '../services/gemini-live.service.js';
import { processCallEnd } from './call-status.handler.js';

// Called for every new WebSocket connection from Twilio Media Streams
export function handleMediaStream(ws: WebSocket): void {
  let callSid: string | null = null;

  ws.on('message', async (raw: Buffer) => {
    let event: TwilioStreamEvent;
    try {
      event = JSON.parse(raw.toString()) as TwilioStreamEvent;
    } catch {
      return;
    }

    switch (event.event) {
      case 'start': {
        const start = event as TwilioStartEvent;
        callSid = start.start.callSid;
        const streamSid = start.streamSid;
        const callerPhone = start.start.customParameters?.From ?? 'Unknown';

        console.log(`🎬 Stream start [${callSid}] from ${callerPhone}`);
        try {
          await createSession(callSid, streamSid, callerPhone, ws);
        } catch (err) {
          console.error(`❌ Gemini session create failed [${callSid}]:`, err);
          ws.close();
        }
        break;
      }

      case 'media': {
        const media = event as TwilioMediaEvent;
        if (!callSid || media.media.track !== 'inbound') return;
        // Only process inbound (caller's voice) — send to Gemini
        sendAudioToGemini(callSid, media.media.payload);
        break;
      }

      case 'stop': {
        const stop = event as TwilioStopEvent;
        const sid = stop.stop.callSid ?? callSid;
        if (!sid) return;
        console.log(`🛑 Stream stop [${sid}]`);
        const session = closeSession(sid);
        if (session) {
          // Process call end asynchronously — don't block stream close
          processCallEnd(session).catch(err =>
            console.error(`❌ Post-call processing failed [${sid}]:`, err),
          );
        }
        ws.close();
        break;
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error [${callSid ?? 'unknown'}]:`, err.message);
  });

  ws.on('close', () => {
    if (callSid) {
      const session = closeSession(callSid);
      if (session) {
        processCallEnd(session).catch(() => {});
      }
    }
  });
}
