import { state, remotes } from '../state.js';
import { shockwave } from '../fx/shockwave.js';
import { addKnockback } from '../player/knockback.js';
import { playAt } from './positional.js';
import { BIG_PUNCH } from '../config.js';

// Cú "đấm trời giáng" của người hoá to (server/game/bigPunch.js). Tay mình đã chạy hoạt ảnh ngay lúc bấm/thả (player/bigPunch.js),
// nên các tin về chính mình chỉ để xử lý phần còn lại; người khác thì dựng hoạt ảnh theo tin.
const rightHand = (id) => (id === state.myId ? null : remotes.get(id)?.fists.R);

export const bigPunchHandlers = {
  bigcharge(m) {
    rightHand(m.id)?.chargeBig?.(); // tay dựng bằng code (model chưa nạp xong) không có hoạt ảnh này
  },

  bigcancel(m) {
    rightHand(m.id)?.cancelBig?.();
  },

  bigpunch(m) {
    rightHand(m.id)?.releaseBig?.();
    const r = remotes.get(m.id);
    if (r && m.id !== state.myId) playAt('whoosh', r.root.position);
  },

  // Sóng xung kích nổ ra ở `at` bán kính `r`: vòng sáng, tiếng nổ, rung camera nhỏ dần theo khoảng cách.
  bigimpact(m) {
    const [x, y, z] = m.at;
    shockwave(x, y, z, m.r);
    playAt('thud', { x, z });
    playAt('explosion', { x, z });
    const dist = Math.hypot(x - state.me.x, z - state.me.z);
    state.shake = Math.max(state.shake, BIG_PUNCH.shake * Math.max(0, 1 - dist / (m.r * BIG_PUNCH.shakeRange)));
  },

  // Mình bị đánh văng: server gửi vận tốc, ta tự đẩy mình đi (player/knockback.js) và hất lên không.
  knockback(m) {
    if (!state.alive) return;
    addKnockback(m.vx, m.vz);
    state.vy = Math.max(state.vy, m.vy);
  },
};
