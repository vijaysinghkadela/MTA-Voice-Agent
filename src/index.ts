import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { handleIvr } from './handlers/ivr.handler.js';
import { handleMediaStream } from './handlers/call-stream.handler.js';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', agent: 'Priya — MTA Voice Agent v3', ts: new Date().toISOString() });
});

// Exotel calls this when a call arrives → respond with ExoML to start stream
app.post('/ivr/voice', handleIvr);
app.get('/ivr/voice', handleIvr); // Exotel sometimes uses GET

const server = createServer(app);

// WebSocket endpoint — Exotel streams audio here
const wss = new WebSocketServer({ server, path: '/stream' });
wss.on('connection', (ws) => handleMediaStream(ws));

server.listen(Number(config.PORT), () => {
  console.log(`\n🎤  Priya (MTA Voice Agent v3) on port ${config.PORT}`);
  console.log(`📞  IVR webhook  → ${config.WEBHOOK_BASE_URL}/ivr/voice`);
  console.log(`🔌  Audio stream → wss://${new URL(config.WEBHOOK_BASE_URL).host}/stream`);
  console.log(`📋  Notion inbox → https://notion.so/db41e3034d064fb68f81dbc45a421587\n`);
});
