import { Blob } from '@google/genai';

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  // REDUCED CHUNK SIZE: 4KB (0x1000) instead of 32KB.
  // This prevents "Maximum call stack size exceeded" on webkit browsers/mobile
  const chunkSize = 0x1000; 
  
  for (let i = 0; i < len; i += chunkSize) {
     const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
     // Use spread syntax or explicit loop if apply fails, but with 4KB apply is safe and fast
     binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    let s = data[i];
    // Sanitize input to prevent tokenizer crashes
    if (isNaN(s) || !isFinite(s)) {
        s = 0;
    }
    // Clamp values between -1 and 1
    s = Math.max(-1, Math.min(1, s));
    // Convert to 16-bit PCM
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: arrayBufferToBase64(int16.buffer),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export function resampleTo16k(audioData: Float32Array, origSampleRate: number): Float32Array {
  // Safety check for empty or invalid input
  if (!audioData || audioData.length === 0) return new Float32Array(0);
  
  // Shortcut if already correct
  if (origSampleRate === 16000) return audioData;

  const targetSampleRate = 16000;
  const ratio = origSampleRate / targetSampleRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originalIndex = i * ratio;
    const index1 = Math.floor(originalIndex);
    const index2 = Math.min(Math.ceil(originalIndex), audioData.length - 1);
    const t = originalIndex - index1;
    
    // Linear interpolation with bounds check
    let v1 = audioData[index1];
    let v2 = audioData[index2];
    
    // Sanitize source values
    if (isNaN(v1)) v1 = 0;
    if (isNaN(v2)) v2 = 0;

    result[i] = v1 * (1 - t) + v2 * t;
  }
  return result;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  // CRITICAL FIX: Use byteOffset and length/2 to correctly view the Int16 data within the buffer
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Generates synthetic noise for ambience.
 * type: 'white', 'pink', or 'brown'
 */
export function createNoiseBuffer(ctx: AudioContext, type: 'pink' | 'brown' = 'brown', duration: number = 5): AudioBuffer {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'pink') {
        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11; 
            b6 = white * 0.115926;
        }
    } else {
        // Brown noise
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; 
        }
    }
    return buffer;
}