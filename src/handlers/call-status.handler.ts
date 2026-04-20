import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import {
  detectLanguage,
  detectPriority,
  extractServiceInterest,
  extractField,
} from '../services/language.service.js';
import { createInboxEntry } from '../services/notion.service.js';
import { saveCallLog, linkNotionPage } from '../services/supabase.service.js';
import type { CallSession } from '../services/gemini-live.service.js';
import type { ProcessedCallData } from '../types/index.js';

const ai = new GoogleGenAI({ apiKey: config.GOOGLE_API_KEY });

async function summarizeCall(transcript: string): Promise<string> {
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Summarize this sales call in 2-3 sentences. Include: caller's name/business, what they need, budget/timeline if mentioned, agreed next step. Match the language of the conversation.\n\nTranscript:\n${transcript}`,
            },
          ],
        },
      ],
    });
    return result.text ?? 'Summary not available.';
  } catch {
    return 'Summary generation failed.';
  }
}

function buildFullTranscript(session: CallSession): string {
  return session.transcript
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(e => {
      const mins = Math.floor(e.timestamp / 60000).toString().padStart(2, '0');
      const secs = Math.floor((e.timestamp % 60000) / 1000).toString().padStart(2, '0');
      const speaker = e.role === 'user' ? '👤 Client' : '🤖 Priya';
      return `[${mins}:${secs}] ${speaker}: ${e.content}`;
    })
    .join('\n\n');
}

export async function processCallEnd(session: CallSession): Promise<void> {
  const { callSid, callerPhone, transcript, startTime } = session;
  const durationSec = Math.floor((Date.now() - startTime) / 1000);
  const fullTranscriptText = buildFullTranscript(session);
  const allText = transcript.map(e => e.content).join(' ');

  console.log(`📊 Processing call end [${callSid}] — ${transcript.length} turns, ${durationSec}s`);

  // Extract info from transcript
  const clientName = extractField(allText, [
    /(?:my name is|naam hai|main hun|I'm|naam)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i,
    /(?:ye hai|yeh hoon)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
  ]);
  const businessName = extractField(allText, [
    /(?:my (?:business|company|firm|shop) (?:is|name is)|hamara (?:business|company) (?:hai))\s+([^,.?!\n]+)/i,
    /(?:run a|own a|work (?:for|at))\s+([^,.?!\n]+)/i,
  ]);
  const budget = extractField(allText, [
    /(?:budget|spend|invest)\s+(?:is|hai|around|approx|of)?\s*([\d,]+\s*(?:k|lakh|thousand|lac|rupees|rs|₹)?)/i,
  ]);
  const timeline = extractField(allText, [
    /(?:need it|chahiye|complete|deliver)\s+(?:by|in|within|mein)?\s*([^,.?!\n]+(?:month|week|day|mahine|hafte|din)[^,.?!\n]*)/i,
  ]);
  const callbackTime = extractField(allText, [
    /(?:call back|callback|contact karo)\s+(?:at|on|after|around)?\s*([^,.?!\n]+(?:morning|evening|afternoon|am|pm|baje)[^,.?!\n]*)/i,
  ]);
  const howHeard = extractField(allText, [
    /(?:heard about|found|pata chala|referred)\s+(?:you|MTA)?\s*(?:from|via|through|se)?\s*([^,.?!\n]+)/i,
  ]);

  const summary = await summarizeCall(fullTranscriptText || allText);

  const callData: ProcessedCallData = {
    callSid,
    phone: callerPhone,
    clientName: clientName ?? 'Unknown Caller',
    businessName: businessName ?? undefined,
    language: detectLanguage(allText),
    serviceInterest: extractServiceInterest(allText),
    priority: detectPriority(allText),
    budget: budget ?? undefined,
    timeline: timeline ?? undefined,
    callbackTime: callbackTime ?? undefined,
    howHeard: howHeard ?? undefined,
    summary,
    transcript,
    durationSec,
    callDate: new Date().toISOString().split('T')[0],
  };

  const dbId = await saveCallLog({
    call_sid: callSid,
    caller_phone: callerPhone,
    client_name: callData.clientName,
    business_name: callData.businessName,
    language: callData.language,
    service_interest: callData.serviceInterest,
    budget: callData.budget,
    timeline: callData.timeline,
    callback_time: callData.callbackTime,
    how_heard: callData.howHeard,
    priority: callData.priority,
    ai_summary: summary,
    full_transcript: transcript,
    call_duration_sec: durationSec,
    call_started_at: new Date(startTime).toISOString(),
    call_ended_at: new Date().toISOString(),
  });

  const notionId = await createInboxEntry(callData);
  await linkNotionPage(callSid, notionId);

  console.log(`✅ [${callSid}] ${callData.clientName} | ${callData.language} | ${callData.serviceInterest} | ${callData.priority}`);
  console.log(`   DB: ${dbId} | Notion: ${notionId}`);
}
