import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { WebSocket } from 'ws';
import { config } from '../config.js';
import { buildSystemPrompt } from '../prompts/priya.prompt.js';
import { twilioToGemini, geminiToTwilio } from '../utils/audio.js';
import type { TranscriptEntry } from '../types/index.js';

const ai = new GoogleGenAI({ apiKey: config.GOOGLE_API_KEY });

export interface CallSession {
  callSid: string;
  streamSid: string;
  callerPhone: string;
  twilioWs: WebSocket;
  geminiSession: Awaited<ReturnType<typeof ai.live.connect>>;
  transcript: TranscriptEntry[];
  startTime: number;
}

// Active sessions keyed by callSid
export const sessions = new Map<string, CallSession>();

export async function createSession(
  callSid: string,
  streamSid: string,
  callerPhone: string,
  twilioWs: WebSocket,
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
      // Transcribe both sides for Notion/Supabase record
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
    callbacks: {
      onopen: () => {
        console.log(`🎤 Gemini session open [${callSid}]`);
      },

      onmessage: (msg: LiveServerMessage) => {
        // Audio response → send back to Twilio
        const parts = msg.serverContent?.modelTurn?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/')) {
            const converted = geminiToTwilio(part.inlineData.data ?? '');
            if (twilioWs.readyState === WebSocket.OPEN) {
              twilioWs.send(
                JSON.stringify({
                  event: 'media',
                  streamSid,
                  media: { payload: converted },
                }),
              );
            }
          }
        }

        // Collect transcripts
        const inTx = msg.serverContent?.inputTranscription?.text;
        const outTx = msg.serverContent?.outputTranscription?.text;
        if (inTx?.trim()) {
          transcript.push({ role: 'user', content: inTx.trim(), timestamp: Date.now() - startTime });
        }
        if (outTx?.trim()) {
          transcript.push({ role: 'assistant', content: outTx.trim(), timestamp: Date.now() - startTime });
        }
      },

      onerror: (e: ErrorEvent) => {
        console.error(`❌ Gemini error [${callSid}]:`, e.message);
      },

      onclose: () => {
        console.log(`🔴 Gemini session closed [${callSid}]`);
      },
    },
  });

  const session: CallSession = {
    callSid,
    streamSid,
    callerPhone,
    twilioWs,
    geminiSession,
    transcript,
    startTime,
  };

  sessions.set(callSid, session);
  return session;
}

export function sendAudioToGemini(callSid: string, base64Mulaw8k: string): void {
  const session = sessions.get(callSid);
  if (!session) return;
  const pcm16k = twilioToGemini(base64Mulaw8k);
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
