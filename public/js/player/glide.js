import { state } from '../state.js';
import { GRAVITY } from '../config.js';

// Liệng sau dash (xem DASH.glide ở server/config.js): dash xong còn lơ lửng thì rơi chậm. Giới hạn vận tốc rơi bắt đầu ở `fall` m/giây ngay khi
// dash xong rồi nới tuyến tính trong `easeMs` tới đúng mức rơi tự do sau ngần đó thời gian (GRAVITY × easeMs), nên hết `easeMs` là rơi bình thường
// mà không bị giật. `until` (mốc performance.now(), server ước tính) là lúc động cơ thôi chạy nếu vẫn chưa chạm đất.
// Gọi trong player/localPlayer.js; không biết gì về dash.
export function startGlide(delayMs, durationMs, fall, easeMs) {
  const now = performance.now();
  Object.assign(state.glide, { startAt: now + delayMs, until: now + delayMs + durationMs, fall, easeMs });
}

export const endGlide = () => {
  state.glide.until = 0;
};

// Đang liệng (động cơ còn chạy): từ lúc dash tới khi chạm đất hoặc hết `until`.
export const isGliding = () => performance.now() < state.glide.until;

// Giới hạn vận tốc rơi (m/giây) lúc này, 0 nếu không giới hạn (không liệng, hoặc đã nới hết về rơi bình thường).
export function glideFall() {
  const { startAt, until, fall, easeMs } = state.glide;
  const now = performance.now();
  if (now >= until || now - startAt >= easeMs) return 0;
  const k = Math.max(0, now - startAt) / easeMs;
  return fall + (GRAVITY * (easeMs / 1000) - fall) * k;
}
