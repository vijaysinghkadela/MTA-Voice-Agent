import type { DetectedLanguage, Priority, ServiceInterest } from '../types/index.js';

const DEVANAGARI = /[\u0900-\u097F]/;
const HINDI_ROMANIZED =
  /\b(hai|hoon|kya|aap|main|mujhe|chahiye|nahi|theek|accha|bolo|batao|karein|karo|hua|gaya|wala|wali|yahan|vahan|kyun|kaise|kitna|bahut|sab|kuch|mere|aapka|humara|toh|bhi|lekin|aur|ya|se|ko|ka|ki|ke|par|mein|ek|do|teen|haan|bilkul|samajh|bata|dena|lena|milna|chahta|chahti|sochna|jaldi|abhi|zaroor|shukriya|alvida|namaste|ji|karo|karna|karna|lagta|lagti)\b/gi;
const ENGLISH_MARKERS =
  /\b(the|is|are|was|were|have|has|will|would|can|could|should|need|want|looking|interested|business|website|app|service|help|contact|call|email|price|cost|our|your|their|this|that|with|from|about|what|how|when|where|why)\b/gi;

export function detectLanguage(text: string): DetectedLanguage {
  if (!text || text.trim().length < 3) return 'English';
  if (DEVANAGARI.test(text)) return 'Hindi';
  const words = text.trim().split(/\s+/).length;
  const hindiHits = (text.match(HINDI_ROMANIZED) || []).length;
  const engHits = (text.match(ENGLISH_MARKERS) || []).length;
  const hr = hindiHits / Math.max(words, 1);
  const er = engHits / Math.max(words, 1);
  if (hr > 0.25 && er > 0.15) return 'Hinglish';
  if (hr > 0.2) return 'Hindi';
  if (hr > 0.08) return 'Hinglish';
  return 'English';
}

export function detectPriority(text: string): Priority {
  const t = text.toLowerCase();
  const high = ['urgent', 'asap', 'immediately', 'jaldi', 'abhi', 'turant', 'emergency', 'deadline', 'quickly', 'launch soon'];
  const low = ['someday', 'exploring', 'just thinking', 'future', 'later', 'planning phase', 'research', 'soch raha', 'dekh raha'];
  if (high.some(w => t.includes(w))) return '🔴 High';
  if (low.some(w => t.includes(w))) return '🟢 Low';
  return '🟡 Medium';
}

export function extractServiceInterest(text: string): ServiceInterest {
  const t = text.toLowerCase();
  if (/\b(whatsapp|wa bot|wa agent|chat agent|chatbot|whatsapp business|wp bot)\b/.test(t))
    return 'WhatsApp Chat Agent';
  if (/\b(voice agent|voice ai|ai call|phone bot|call bot|voice bot|ai voice|calling agent)\b/.test(t))
    return 'AI Voice Agent';
  if (/\b(dashboard|management dashboard|ai dashboard|analytics|reporting|crm|bi tool|data dashboard)\b/.test(t))
    return 'AI Management Dashboard';
  if (/\b(social media|instagram|facebook|reels|content|smm|digital marketing|ads|influencer)\b/.test(t))
    return 'Social Media Marketing';
  if (/\b(security|cyber|hack|pentest|audit|vapt|vulnerability|firewall|compliance)\b/.test(t))
    return 'Cybersecurity';
  if (/\b(ecommerce|e-commerce|shopify|store|product listing|sell online|online shop|amazon|flipkart)\b/.test(t))
    return 'E-Commerce';
  return 'Multiple / Unsure';
}

export function extractField(transcript: string, patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const m = transcript.match(p);
    if (m?.[1]) return m[1].trim().replace(/[.,?!]$/, '');
  }
  return undefined;
}
