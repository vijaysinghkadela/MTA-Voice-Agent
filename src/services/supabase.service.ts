import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import type { CallLogInsert } from '../types/index.js';

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function saveCallLog(data: CallLogInsert): Promise<string> {
  const { data: row, error } = await supabase
    .from('call_logs')
    .insert(data)
    .select('id')
    .single();
  if (error) throw new Error(`Supabase insert: ${error.message}`);
  return row.id as string;
}

export async function linkNotionPage(callSid: string, notionPageId: string): Promise<void> {
  const { error } = await supabase
    .from('call_logs')
    .update({ notion_page_id: notionPageId, updated_at: new Date().toISOString() })
    .eq('call_sid', callSid);
  if (error) throw new Error(`Supabase update: ${error.message}`);
}
