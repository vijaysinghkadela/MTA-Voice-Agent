# MTA Voice Agent — Priya

AI voice assistant for Manglam Technical Agency. Handles inbound calls, speaks Hindi/English/Hinglish, saves everything to Notion + Supabase.

**Stack**: Exotel (calls) + Google Gemini 2.5 Flash (voice AI) + Notion (inbox) + Supabase (storage) + Render (hosting)

## Architecture

```
Client calls MTA number
       ↓
Exotel streams audio (WebSocket) → /stream
       ↓
Server bridges to Gemini 2.5 Flash Multimodal Live
       ↓
Gemini responds with voice (real-time)
       ↓
Call ends → transcript + summary saved
       ↓
Notion card created + Supabase row inserted
```

## Setup

### 1. Supabase migration
```sql
-- Paste supabase/migrations/20260420000000_call_logs.sql into Supabase SQL Editor
```

### 2. Deploy to Render
- Push this repo to GitHub
- Render → New Web Service → connect repo
- Add env vars from `.env.example`
- Set `WEBHOOK_BASE_URL` to your Render URL
- **Use Starter plan ($7/mo)** — free tier sleeps and will drop calls

### 3. Exotel setup
- exotel.com → create account
- Use your MTA number `+919694322131` with Exotel flow/webhook routing
- Configure voice webhook:
  - `https://your-render-url.onrender.com/ivr/voice` (GET or POST)

### 4. Notion integration
- notion.so → Settings → Connections → Create integration
- Share the "Voice Agent — Client Inbox" database with the integration
- Copy the integration token → `NOTION_API_KEY`

### 5. Google API Key
- aistudio.google.com → Get API Key
- Must support Gemini 2.5 Flash and Live API access

## Env vars
See `.env.example` for all required variables.

## Local dev
```bash
npm install
cp .env.example .env   # fill in values
npm run dev
# Use ngrok for local Exotel testing:
# ngrok http 3000
# Set Exotel webhook to your ngrok URL
```

## Notion inbox
https://notion.so/db41e3034d064fb68f81dbc45a421587
