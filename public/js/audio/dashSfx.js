// Tiếng dash của động cơ phản lực (tổng hợp, không dùng file). Hàm nhận (pan, gain) để dùng được với Sfx.at.
import { audio, filteredNoise, note } from './core.js';

// Động cơ bốc lên rồi xì hơi: luồng khí tăng dần rồi tan, kèm tiếng ù trầm trượt lên.
export function dash(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'bandpass', freq: 1400, q: 0.8, dur: 0.45, peak: 0.55, attack: 0.04, pan, gain });
  filteredNoise({ type: 'highpass', freq: 3500, delay: 0.03, dur: 0.3, peak: 0.25, pan, gain });
  note({ freq: 90, slideTo: 260, type: 'sawtooth', dur: 0.32, peak: 0.28, attack: 0.03, pan, gain });
  note({ freq: 180, slideTo: 90, type: 'square', delay: 0.18, dur: 0.22, peak: 0.12, pan, gain });
}

export const kinds = { dash };
