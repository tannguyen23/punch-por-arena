// Tai ù ngắn khi mình dính đòn nặng (tổng hợp, không dùng file; tiếng trúng đòn do file âm thanh riêng lo). Nối thẳng `audio.ears` nên không bị
// nghẹt như các tiếng khác, tắt tiếng (M) thì tắt theo. Dài hơn và rõ hơn khi `strength` lớn (0–1).
import { audio } from './core.js';

const RING_FREQ = 3800;

export function hitRing(strength) {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime;
  const seconds = 0.25 + 0.4 * strength;
  const osc = audio.ctx.createOscillator();
  osc.frequency.value = RING_FREQ;
  const env = audio.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(0.07 * strength, t + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(env);
  env.connect(audio.ears);
  osc.start(t);
  osc.stop(t + seconds + 0.05);
}
