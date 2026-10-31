import { state, remotes } from '../state.js';
import { shockwave } from '../fx/shockwave.js';
import { addKnockback } from '../player/knockback.js';
import { startLeap } from '../player/leapFlight.js';
import { flightOf } from '../core/throwPath.js';
import { bigPunchHand } from '../player/viewmodel.js';
import { playAt } from './positional.js';
import { BIG_PUNCH } from '../config.js';

// Cú "đấm trời giáng" của người hoá to (server/game/bigPunch.js). Tay mình chạy hoạt ảnh lấy đà ngay lúc bấm (player/bigPunch.js); các tin
// còn lại (nhảy, đấm xuống, huỷ) đều theo server, kể cả của chính mình.
const rightHand = (id) => (id === state.myId ? { chargeBig() {}, cancelBig: () => bigPunchHand('cancel'), releaseBig: () => bigPunchHand('release') } : remotes.get(id)?.fists.R);

export const bigPunchHandlers = {
  bigcharge(m) {
    rightHand(m.id)?.chargeBig?.(); // tay dựng bằng code (model chưa nạp xong) không có hoạt ảnh này
  },

  bigcancel(m) {
    rightHand(m.id)?.cancelBig?.();
    if (m.id === state.myId) state.bigPunch.readyAt = 0; // server không cho nhảy (không có chỗ rơi...): không tốn hồi chiêu
  },

  // Nhảy vọt: người nhảy tự bay theo kế hoạch (người khác thấy qua vị trí snapshot); nhát đấm xuống chạy sao cho tay duỗi hết cỡ đúng lúc chạm đất.
  bigpunch(m) {
    const [x, y, z] = m.to;
    if (m.id === state.myId) startLeap(flightOf(m), { x, y, z });
    else {
      const r = remotes.get(m.id);
      if (r) playAt('whoosh', r.root.position);
    }
    setTimeout(() => rightHand(m.id)?.releaseBig?.(), Math.max(0, m.duration - m.impactMs));
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
    if (m.vy > 0) state.vy = Math.max(state.vy, m.vy); // đòn cận chiến đẩy lùi (server/game/hitKnock.js) không có vy: giữ nguyên cú rơi / nhảy
  },
};
