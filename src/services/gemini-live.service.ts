import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { WebSocket } from 'ws';
import { config } from '../config.js';
import { buildSystemPrompt } from '../prompts/priya.prompt.js';
import { phoneToGemini, geminiToPhone } from '../utils/audio.js';
import type { TranscriptEntry } from '../types/index.js';

const ai = new GoogleGenAI({ apiKey: config.GOOGLE_API_KEY });

export interface CallSession {
  callSid: string;
  streamSid: string;
  callerPhone: string;
  telephonyWs: WebSocket;
  geminiSession: Awaited<ReturnType<typeof ai.live.connect>>;
  transcript: TranscriptEntry[];
  startTime: number;
}

export const sessions = new Map<string, CallSession>();

export async function createSession(
  callSid: string,
  streamSid: string,
  callerPhone: string,
  ws: WebSocket,
): Promise<CallSession> {
  const transcript: TranscriptEntry[] = [];
  const startTime = Date.now();

  const geminiSession = await ai.live.connect({
    model: config.GEMINI_MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: {
        parts: [{ text: buildSystemPrompt(config.TRANSFER_PHONE_NUMBER) }],
      },
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: config.GEMINI_VOICE },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
    callbacks: {
      onopen: () => console.log(`🎤 Gemini session open [${callSid}]`),

      onmessage: (msg: LiveServerMessage) => {
        // Audio → convert and stream back to phone caller
        const parts = msg.serverContent?.modelTurn?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/')) {
            const phoneAudio = geminiToPhone(part.inlineData.data ?? '');
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                event: 'media',
                streamSid,
                media: { payload: phoneAudio },
              }));
            }
          }
        }
        // Collect transcripts
        const inTx = msg.serverContent?.inputTranscription?.text;
        const outTx = msg.serverContent?.outputTranscription?.text;
        const now = Date.now() - startTime;
        if (inTx?.trim()) transcript.push({ role: 'user', content: inTx.trim(), timestamp: now });
        if (outTx?.trim()) transcript.push({ role: 'assistant', content: outTx.trim(), timestamp: now });
      },

      onerror: (e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`❌ Gemini [${callSid}]:`, message);
      },
      onclose: () => console.log(`🔴 Gemini closed [${callSid}]`),
    },
  });

  const session: CallSession = { callSid, streamSid, callerPhone, telephonyWs: ws, geminiSession, transcript, startTime };
  sessions.set(callSid, session);
  return session;
}

export function sendAudioToGemini(callSid: string, base64Audio: string): void {
  const session = sessions.get(callSid);
  if (!session) return;
  const pcm16k = phoneToGemini(base64Audio, 'mulaw');
  session.geminiSession.sendRealtimeInput({
    audio: { data: pcm16k, mimeType: 'audio/pcm;rate=16000' },
  });
}

export function closeSession(callSid: string): CallSession | undefined {
  const session = sessions.get(callSid);
  if (session) {
    try { session.geminiSession.close(); } catch {}
    sessions.delete(callSid);
  }
  return session;
}
