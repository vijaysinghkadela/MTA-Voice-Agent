import { Client } from '@notionhq/client';
import { config } from '../config.js';
import type { ProcessedCallData, TranscriptEntry } from '../types/index.js';

const notion = new Client({ auth: config.NOTION_API_KEY });

function buildTranscriptText(transcript: TranscriptEntry[]): string {
  return transcript
    .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
    .map((entry) => {
      const speaker = entry.role === 'user' ? '👤 Client' : '🤖 Priya';
      const t = Math.floor(entry.timestamp / 1000);
      const mins = Math.floor(t / 60).toString().padStart(2, '0');
      const secs = (t % 60).toString().padStart(2, '0');
      return `[${mins}:${secs}] ${speaker}: ${entry.content}`;
    })
    .join('\n\n');
}

export async function createInboxEntry(data: ProcessedCallData): Promise<string> {
  const transcriptText = data.transcript.length > 0
    ? buildTranscriptText(data.transcript)
    : 'No transcript captured.';

  const page = await notion.pages.create({
    parent: { database_id: config.NOTION_INBOX_DB_ID },
    properties: {
      'Client Name': {
        title: [{ text: { content: data.clientName || 'Unknown Caller' } }],
      },
      'Phone': { phone_number: data.phone },
      'Status': { select: { name: '🆕 New' } },
      'Language': { select: { name: data.language } },
      'Service Interest': { select: { name: data.serviceInterest } },
      'Priority': { select: { name: data.priority } },
      'Business Name': {
        rich_text: [{ text: { content: data.businessName ?? '' } }],
      },
      'Budget': {
        rich_text: [{ text: { content: data.budget ?? 'Not mentioned' } }],
      },
      'Timeline': {
        rich_text: [{ text: { content: data.timeline ?? 'Not specified' } }],
      },
      'Callback Time': {
        rich_text: [{ text: { content: data.callbackTime ?? 'Anytime' } }],
      },
      'How They Heard': {
        rich_text: [{ text: { content: data.howHeard ?? 'Not mentioned' } }],
      },
      'AI Summary': {
        rich_text: [{ text: { content: data.summary.slice(0, 2000) } }],
      },
      'Call Duration (sec)': { number: data.durationSec },
      'Call ID': { rich_text: [{ text: { content: data.callSid } }] },
      'Call Date': { date: { start: data.callDate } },
    },
    // Page body: summary + full transcript toggle
    children: [
      {
        object: 'block' as const,
        type: 'callout' as const,
        callout: {
          rich_text: [{ text: { content: data.summary } }],
          icon: { emoji: '🤖' },
          color: 'blue_background' as const,
        },
      },
      { object: 'block' as const, type: 'divider' as const, divider: {} },
      {
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ text: { content: '📋 Extracted Details' } }],
        },
      },
      {
        object: 'block' as const,
        type: 'bulleted_list_item' as const,
        bulleted_list_item: {
          rich_text: [{ text: { content: `Service: ${data.serviceInterest}` } }],
        },
      },
      {
        object: 'block' as const,
        type: 'bulleted_list_item' as const,
        bulleted_list_item: {
          rich_text: [{ text: { content: `Budget: ${data.budget ?? 'Not mentioned'}` } }],
        },
      },
      {
        object: 'block' as const,
        type: 'bulleted_list_item' as const,
        bulleted_list_item: {
          rich_text: [{ text: { content: `Timeline: ${data.timeline ?? 'Not specified'}` } }],
        },
      },
      {
        object: 'block' as const,
        type: 'bulleted_list_item' as const,
        bulleted_list_item: {
          rich_text: [{ text: { content: `Callback: ${data.callbackTime ?? 'Anytime'}` } }],
        },
      },
      {
        object: 'block' as const,
        type: 'bulleted_list_item' as const,
        bulleted_list_item: {
          rich_text: [{ text: { content: `Source: ${data.howHeard ?? 'Not mentioned'}` } }],
        },
      },
      { object: 'block' as const, type: 'divider' as const, divider: {} },
      {
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [{ text: { content: '🎙️ Full Transcript' } }],
        },
      },
      {
        object: 'block' as const,
        type: 'toggle' as const,
        toggle: {
          rich_text: [
            {
              text: {
                content: `View full conversation (${data.transcript.filter((entry) => entry.role === 'user' || entry.role === 'assistant').length} turns · ${data.durationSec}s)`,
              },
            },
          ],
          children: [
            {
              object: 'block' as const,
              type: 'code' as const,
              code: {
                rich_text: [{ text: { content: transcriptText.slice(0, 10000) } }],
                language: 'plain text' as const,
              },
            },
          ],
        },
      },
    ],
  });

  return page.id;
}
