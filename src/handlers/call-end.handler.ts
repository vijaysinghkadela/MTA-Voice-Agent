import type { Request, Response } from 'express';
import type { VapiEndOfCallReport } from '../types/vapi.js';
import type { ProcessedCallData, TranscriptEntry } from '../types/index.js';
import {
  detectLanguage,
  detectPriority,
  extractServiceInterest,
  extractField,
} from '../services/language.service.js';
import { createInboxEntry } from '../services/notion.service.js';
import { saveCallLog, linkNotionPage } from '../services/supabase.service.js';

function parseReport(report: VapiEndOfCallReport): ProcessedCallData {
  const { call, transcript = '', summary = '', messages = [] } = report;
  const fullText = `${summary} ${transcript}`;
  const sharedTranscript: TranscriptEntry[] = messages
    .filter((m): m is typeof m & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role,
      content: m.message,
      timestamp: Math.round(m.secondsFromStart * 1000),
    }));

  const clientName = extractField(transcript, [
    /(?:my name is|naam hai|main hun|I'm|naam)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i,
    /(?:ye hai|ye hoon|yeh hai)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
  ]);

  const businessName = extractField(transcript, [
    /(?:my (?:business|company|firm|shop|store) (?:is|name is)|hamara (?:business|company) (?:hai|ka naam))\s+([^,.?!\n]+)/i,
    /(?:work (?:for|at|in)|run a|own a)\s+([^,.?!\n]+)/i,
  ]);

  const budget = extractField(transcript, [
    /(?:budget|spend|invest|lagana)\s+(?:is|hai|around|approx|of)?\s*([\d,]+\s*(?:k|lakh|thousand|lac|rupees|rs|₹)?)/i,
    /([\d,]+\s*(?:k|lakh|thousand|lac|rupees))/i,
  ]);

  const timeline = extractField(transcript, [
    /(?:need it|chahiye|complete|deliver|launch)\s+(?:by|in|within|mein)?\s*([^,.?!\n]+(?:month|week|day|mahine|hafte|din)[^,.?!\n]*)/i,
    /(?:deadline|by)\s+([A-Za-z]+ \d{4}|\d+ (?:weeks?|months?|days?))/i,
  ]);

  const callbackTime = extractField(transcript, [
    /(?:call (?:me )?back|callback|contact karo|reach out)\s+(?:at|on|after|around|between)?\s*([^,.?!\n]+(?:morning|evening|afternoon|night|subah|sham|raat|baje|am|pm)[^,.?!\n]*)/i,
    /(?:best time|good time|available)\s+(?:is|hai)?\s*([^,.?!\n]+(?:morning|evening|afternoon|am|pm|baje)[^,.?!\n]*)/i,
  ]);

  const howHeard = extractField(transcript, [
    /(?:heard (?:about|of)|found|pata chala|bataya|referred)\s+(?:you|MTA|agency)?\s*(?:from|via|through|se)?\s*([^,.?!\n]+)/i,
    /(?:google|instagram|facebook|youtube|linkedin|someone|friend|referral|social media)\s+(?:se|ne|told|shared)/i,
  ]);

  return {
    callSid: call.id,
    phone: call.customer?.number ?? 'Unknown',
    clientName: clientName ?? call.customer?.name ?? 'Unknown Caller',
    businessName: businessName ?? undefined,
    language: detectLanguage(transcript),
    serviceInterest: extractServiceInterest(fullText),
    priority: detectPriority(fullText),
    budget: budget ?? undefined,
    timeline: timeline ?? undefined,
    callbackTime: callbackTime ?? undefined,
    howHeard: howHeard ?? undefined,
    summary: summary || 'No summary generated.',
    transcript: sharedTranscript,
    durationSec: call.duration ?? 0,
    callDate: new Date(call.startedAt ?? call.createdAt).toISOString().split('T')[0],
  };
}

export async function handleCallEnd(req: Request, res: Response): Promise<void> {
  // Acknowledge immediately — Vapi times out if we wait
  res.sendStatus(200);

  const report = req.body as VapiEndOfCallReport;
  if (report.type !== 'end-of-call-report') return;

  const callId = report.call.id;
  console.log(`📞 Processing call: ${callId}`);

  try {
    const data = parseReport(report);

    // 1. Persist to Supabase
    const dbRowId = await saveCallLog({
      call_sid: callId,
      caller_phone: data.phone,
      client_name: data.clientName,
      business_name: data.businessName,
      language: data.language,
      service_interest: data.serviceInterest,
      budget: data.budget,
      timeline: data.timeline,
      callback_time: data.callbackTime,
      how_heard: data.howHeard,
      priority: data.priority,
      ai_summary: data.summary,
      full_transcript: data.transcript,
      call_duration_sec: data.durationSec,
      call_started_at: report.call.startedAt,
      call_ended_at: report.call.endedAt,
    });

    // 2. Create Notion inbox card
    const notionPageId = await createInboxEntry(data);

    // 3. Link them together
    await linkNotionPage(callId, notionPageId);

    console.log(`✅ ${data.clientName} | ${data.language} | ${data.serviceInterest} | ${data.priority}`);
    console.log(`   DB: ${dbRowId} | Notion: ${notionPageId}`);
  } catch (err) {
    console.error(`❌ Failed to process call ${callId}:`, err);
  }
}
