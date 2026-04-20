import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { handleTwiml } from './handlers/twiml.handler.js';
import { handleMediaStream } from './handlers/call-stream.handler.js';

const app = express();
app.use(express.urlencoded({ extended: false })); // Twilio sends URL-encoded POSTs
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', agent: 'Priya — MTA Voice Agent v2', timestamp: new Date().toISOString() });
});

// ── Twilio: inbound call → return TwiML to start media stream ─────────────────
app.post('/twiml/voice', handleTwiml);

// ── HTTP server (needed for WebSocket upgrade) ────────────────────────────────
const server = createServer(app);

// ── WebSocket server for Twilio Media Streams ─────────────────────────────────
const wss = new WebSocketServer({ server, path: '/stream' });

wss.on('connection', (ws) => {
  handleMediaStream(ws);
});

server.listen(Number(config.PORT), () => {
  console.log(`\n🎤  Priya (MTA Voice Agent v2) running on port ${config.PORT}`);
  console.log(`📞  TwiML webhook  → ${config.WEBHOOK_BASE_URL}/twiml/voice`);
  console.log(`🔌  Media stream   → wss://${new URL(config.WEBHOOK_BASE_URL).host}/stream`);
  console.log(`📋  Notion inbox   → https://notion.so/db41e3034d064fb68f81dbc45a421587\n`);
});
