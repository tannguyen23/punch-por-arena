// Tiếng mưa, sấm sét (tổng hợp, không dùng file).
import { audio, noise, filteredNoise, note } from './core.js';

const SMOOTH_S = 0.4; // mưa to / nhỏ dần chứ không bật tắt đột ngột

// Tiếng mưa rào kêu liên tục: tiếng ồn qua bộ lọc dải cao (lộp độp) và dải thấp (ào ào). Trả về { set(gain), stop() }.
export function rainLoop() {
  if (!audio.ctx) return { set() {}, stop() {} };
  const { ctx } = audio;
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(audio.master);
  const src = noise(ctx.currentTime, undefined, true);
  for (const [type, freq, level] of [['bandpass', 5000, 0.5], ['lowpass', 900, 0.7]]) {
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(filter);
    filter.connect(g);
    g.connect(out);
  }
  return {
    set(gain) {
      out.gain.setTargetAtTime(gain, ctx.currentTime, SMOOTH_S);
    },
    stop() {
      out.gain.setTargetAtTime(0, ctx.currentTime, SMOOTH_S);
      src.stop(ctx.currentTime + 2);
    },
  };
}

// Sét sắp đánh: tiếng xèo xèo của tĩnh điện.
export function crackle(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'highpass', freq: 4000, dur: 1.1, peak: 0.35, attack: 0.3, pan, gain });
}

// Sấm: tiếng nổ đanh (khi ở gần) rồi tiếng ì ầm kéo dài, tới trễ `delay` giây theo khoảng cách.
export function thunder(pan = 0, gain = 1, delay = 0) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'highpass', freq: 1500, delay, dur: 0.2, peak: 1.2 * gain * gain, pan, gain });
  filteredNoise({ type: 'lowpass', freq: 160, delay, dur: 2.6, peak: 1.4, attack: 0.05, pan, gain });
  filteredNoise({ type: 'lowpass', freq: 320, delay: delay + 0.3, dur: 1.6, peak: 0.6, attack: 0.2, pan, gain });
  note({ freq: 55, slideTo: 30, delay, dur: 1.5, peak: 0.8, attack: 0.01, pan, gain });
}

export const kinds = { crackle };
