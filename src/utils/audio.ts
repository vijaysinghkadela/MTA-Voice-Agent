// Audio conversion: Telephony mulaw/PCM 8kHz <-> Gemini PCM16 16kHz/24kHz

const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

function decodeMulaw(byte: number): number {
  byte = ~byte & 0xff;
  const sign = byte & 0x80;
  const exp = (byte & 0x70) >> 4;
  const mantissa = byte & 0x0f;
  let s = ((mantissa << 3) + MULAW_BIAS) << exp;
  s -= MULAW_BIAS;
  return sign ? -s : s;
}

function encodeMulaw(s: number): number {
  const sign = s < 0 ? 0x80 : 0;
  if (s < 0) s = -s;
  s = Math.min(s + MULAW_BIAS, MULAW_CLIP + MULAW_BIAS);
  let exp = 7;
  for (let mask = 0x4000; (s & mask) === 0 && exp > 0; exp--, mask >>= 1);
  const mantissa = (s >> (exp + 3)) & 0x0f;
  return (~(sign | (exp << 4) | mantissa)) & 0xff;
}

function resample(input: Int16Array, inRate: number, outRate: number): Int16Array {
  if (inRate === outRate) return input;
  const ratio = inRate / outRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const lo = Math.floor(src);
    const hi = Math.min(lo + 1, input.length - 1);
    out[i] = Math.round(input[lo] * (1 - (src - lo)) + input[hi] * (src - lo));
  }
  return out;
}

/**
 * Phone → Gemini
 * Input:  base64 mulaw 8kHz (Exotel default encoding)
 * Output: base64 PCM16 16kHz (Gemini Live API input format)
 */
export function phoneToGemini(base64Input: string, encoding: 'mulaw' | 'pcm' = 'mulaw'): string {
  const raw = Buffer.from(base64Input, 'base64');
  let pcm8k: Int16Array;

  if (encoding === 'mulaw') {
    pcm8k = new Int16Array(raw.length);
    for (let i = 0; i < raw.length; i++) pcm8k[i] = decodeMulaw(raw[i]);
  } else {
    // raw PCM16 already
    pcm8k = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
  }

  const pcm16k = resample(pcm8k, 8000, 16000);
  return Buffer.from(pcm16k.buffer, pcm16k.byteOffset, pcm16k.byteLength).toString('base64');
}

/**
 * Gemini → Phone
 * Input:  base64 PCM16 24kHz (Gemini output)
 * Output: base64 mulaw 8kHz
 */
export function geminiToPhone(base64Pcm24k: string): string {
  const raw = Buffer.from(base64Pcm24k, 'base64');
  const pcm24k = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
  const pcm8k = resample(pcm24k, 24000, 8000);
  const mulaw = Buffer.alloc(pcm8k.length);
  for (let i = 0; i < pcm8k.length; i++) mulaw[i] = encodeMulaw(pcm8k[i]);
  return mulaw.toString('base64');
}
