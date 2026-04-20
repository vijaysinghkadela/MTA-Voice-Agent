import type { Request, Response } from 'express';
import { config } from '../config.js';

// Twilio calls this when a call comes in → respond with TwiML to start media stream
export function handleTwiml(req: Request, res: Response): void {
  const callSid = req.body?.CallSid ?? 'unknown';
  const streamUrl = `wss://${new URL(config.WEBHOOK_BASE_URL).host}/stream`;

  console.log(`📞 Inbound call [${callSid}] → starting stream`);

  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamUrl}">
      <Parameter name="callSid" value="${callSid}"/>
    </Stream>
  </Connect>
</Response>`);
}
