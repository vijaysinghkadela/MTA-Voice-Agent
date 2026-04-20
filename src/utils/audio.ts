// Audio conversion utilities: Twilio mulaw 8kHz <-> Gemini PCM16 16kHz

const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

// Decode single mulaw byte to PCM16 sample
function decodeMulaw(byte: number): number {
  byte = ~byte & 0xff;
  const sign = byte & 0x80;
  const exponent = (byte & 0x70) >> 4;
  const mantissa = byte & 0x0f;
  let sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
  sample -= MULAW_BIAS;
  return sign ? -sample : sample;
}

// Encode PCM16 sample to mulaw byte
function encodeMulaw(sample: number): number {
  const sign = sample < 0 ? 0x80 : 0;
  if (sample < 0) sample = -sample;
  sample = Math.min(sample + MULAW_BIAS, MULAW_CLIP + MULAW_BIAS);
  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; exponent--, mask >>= 1);
  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  return (~(sign | (exponent << 4) | mantissa)) & 0xff;
}

// Linear interpolation resampler
function resamplePcm16(input: Int16Array, inRate: number, outRate: number): Int16Array {
  if (inRate === outRate) return input;
  const ratio = inRate / outRate;
  const outLen = Math.floor(input.length / ratio);
  const output = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const lo = Math.floor(src);
    const hi = Math.min(lo + 1, input.length - 1);
    const frac = src - lo;
    output[i] = Math.round(input[lo] * (1 - frac) + input[hi] * frac);
  }
  return output;
}

/**
 * Twilio -> Gemini
 * Input:  base64 mulaw 8kHz
 * Output: base64 PCM16 16kHz (Gemini expects 16kHz)
 */
export function twilioToGemini(base64Mulaw8k: string): string {
  const mulaw = Buffer.from(base64Mulaw8k, 'base64');
  // mulaw → PCM16 8kHz
  const pcm8k = new Int16Array(mulaw.length);
  for (let i = 0; i < mulaw.length; i++) {
    pcm8k[i] = decodeMulaw(mulaw[i]);
  }
  // resample 8kHz → 16kHz
  const pcm16k = resamplePcm16(pcm8k, 8000, 16000);
  // Int16Array → Buffer → base64
  const buf = Buffer.from(pcm16k.buffer, pcm16k.byteOffset, pcm16k.byteLength);
  return buf.toString('base64');
}

/**
 * Gemini -> Twilio
 * Input:  base64 PCM16 24kHz (Gemini output)
 * Output: base64 mulaw 8kHz
 */
export function geminiToTwilio(base64Pcm24k: string): string {
  const rawBuf = Buffer.from(base64Pcm24k, 'base64');
  // Buffer → Int16Array
  const pcm24k = new Int16Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength / 2);
  // resample 24kHz → 8kHz
  const pcm8k = resamplePcm16(pcm24k, 24000, 8000);
  // PCM16 → mulaw
  const mulaw = Buffer.alloc(pcm8k.length);
  for (let i = 0; i < pcm8k.length; i++) {
    mulaw[i] = encodeMulaw(pcm8k[i]);
  }
  return mulaw.toString('base64');
}
