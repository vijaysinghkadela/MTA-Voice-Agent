import type { Request, Response } from 'express';
import { config } from '../config.js';

// Exotel calls this URL when someone calls your number
// We respond with ExoML to start WebSocket audio streaming
export function handleIvr(req: Request, res: Response): void {
  const callSid = (req.body?.CallSid ?? req.query?.CallSid ?? 'unknown') as string;
  const streamUrl = `wss://${new URL(config.WEBHOOK_BASE_URL).host}/stream`;

  console.log(`📞 Inbound call [${callSid}] → opening stream`);

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
