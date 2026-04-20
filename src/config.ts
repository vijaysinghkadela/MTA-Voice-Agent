import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Google Gemini
  GOOGLE_API_KEY: z.string(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash-preview-native-audio-dialog'),
  GEMINI_VOICE: z.string().default('Aoede'),
  // Exotel (Indian cloud telephony — exotel.com)
  EXOTEL_API_KEY: z.string().optional(),
  EXOTEL_API_TOKEN: z.string().optional(),
  EXOTEL_SID: z.string().optional(),
  // Notion
  NOTION_API_KEY: z.string(),
  NOTION_INBOX_DB_ID: z.string(),
  // Supabase
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  // Business
  TRANSFER_PHONE_NUMBER: z.string().default('+919694322131'),
  WEBHOOK_BASE_URL: z.string().default('https://mta-voice-agent.onrender.com'),
  WEBHOOK_SECRET: z.string().default('mta-priya-2026'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Missing env vars:');
  parsed.error.issues.forEach(i => console.error(`  ${i.path.join('.')}: ${i.message}`));
  process.exit(1);
}

export const config = parsed.data;
