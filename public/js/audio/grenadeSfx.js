// Tiếng của lựu đạn choáng (tổng hợp, không dùng file). Lựu đạn nổ dùng chung tiếng `explosion` với tên lửa.
import { audio, filteredNoise, muffle } from './core.js';
import { FLASHBANG } from '../config.js';

const RING_FREQ = 3600; // tiếng ù trong tai sau khi bị choáng

// Lựu đạn choáng nổ: tiếng "đoàng" đanh, gắt hơn lựu đạn nổ, gần như không có tiếng trầm.
export function flashBang(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'highpass', freq: 1800, dur: 0.25, peak: 1.3, pan, gain });
  filteredNoise({ type: 'lowpass', freq: 500, dur: 0.4, peak: 0.6, pan, gain });
}

// Bị choáng: mọi tiếng nghẹt lại và tai ù một tiếng cao, nặng nhẹ theo `strength` (0–1), kéo dài `seconds` giây.
export function stunned(seconds, strength) {
  if (!audio.ctx) return;
  muffle(seconds, FLASHBANG.muffleFreq);
  const t = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  osc.frequency.value = RING_FREQ;
  const env = audio.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(0.12 * strength, t + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(env);
  env.connect(audio.ears);
  osc.start(t);
  osc.stop(t + seconds + 0.05);
}

export const kinds = { flashBang };
