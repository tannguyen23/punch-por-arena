import { state } from '../state.js';
import { positionAt } from '../core/throwPath.js';

// Cú nhảy của "đấm trời giáng" trên máy mình: server gửi đường bay (tin 'bigpunch', cùng dạng với quả ném, xem net/bigPunchHandlers.js) rồi ta
// tự bay theo đó (vị trí do client quyết định). Trong lúc bay không đi, không rơi, không bị đẩy; va chạm tường bỏ qua vì đang ở trên không,
// chạm đất rồi resolveCollisions đẩy ra khỏi vật cản như thường.

export function startLeap(flight, to) {
  state.leap = { flight, to, startedAt: performance.now() };
  state.vy = 0;
  state.knock.x = state.knock.z = 0;
}

export const isLeaping = () => state.leap !== null;

// Dừng giữa chừng (chết, bị choáng...): rơi từ chỗ đang đứng.
export function cancelLeap() {
  state.leap = null;
}

// Gọi mỗi khung hình khi đang nhảy: đặt người theo đường bay, hết giờ thì đặt đúng chỗ rơi (vận tốc server làm tròn nên có thể lệch chút).
export function updateLeap() {
  const { leap, me } = state;
  const elapsed = performance.now() - leap.startedAt;
  const done = elapsed >= leap.flight.duration;
  Object.assign(me, done ? leap.to : positionAt(leap.flight, elapsed / 1000));
  state.vy = 0;
  if (done) state.leap = null;
}
