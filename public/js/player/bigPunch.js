import { state } from '../state.js';
import { keys } from '../core/keys.js';
import { actionBlocked } from '../core/freeze.js';
import { send } from '../net/socket.js';
import { bigPunchHand } from './viewmodel.js';
import * as Sfx from '../audio/sfx.js';
import { BIG_PUNCH } from '../config.js';

// "Đấm trời giáng" của người hoá to: giữ BIG_PUNCH.key để gồng (fx/leapPreview.js vẽ đường nhảy), thả ra lúc nào cũng nhảy đấm, gồng càng lâu
// càng mạnh (server quyết định mọi thứ, xem server/game/bigPunch.js). Dùng được cả khi đang cầm vũ khí, miễn là đang uống thuốc có `bigPunch`
// (state.potionTypes) — lúc gồng, súng ở góc nhìn thứ nhất được thay bằng nắm đấm để chạy hoạt ảnh (player/viewmodel.js).
// Tay mình chạy hoạt ảnh lấy đà ngay lúc bấm; cú nhảy và nhát đấm xuống bắt đầu khi server trả 'bigpunch' (net/bigPunchHandlers.js).

const settings = () => state.potionTypes[state.potion?.id]?.bigPunch ?? null; // { chargeMs, cooldownMs } hoặc null

const canUse = () => state.alive && !actionBlocked() && state.match.phase === 'playing' && settings() !== null
  && !(state.event?.kind === 'tnt' && state.event.targetId === state.myId); // cầm vũ khí gì cũng dùng được

function startCharge(now) {
  const big = state.bigPunch;
  big.charging = true;
  big.startedAt = now;
  send({ t: 'bigcharge' });
  bigPunchHand('charge');
}

function stopCharge(now, fire) {
  const big = state.bigPunch;
  big.charging = false;
  big.charge = 0;
  send({ t: 'bigrelease', yaw: state.yaw, pitch: state.pitch }); // server tự dò chỗ rơi theo hướng ngắm này
  if (!fire) {
    bigPunchHand('cancel');
    return;
  }
  big.readyAt = now + settings().cooldownMs;
  state.cooldown = Math.max(state.cooldown, BIG_PUNCH.lockoutSeconds); // trong lúc tung đòn không đấm thường chen vào
  Sfx.at('whoosh', 0, 0, 0, 0, 0);
}

// Gọi mỗi khung hình. Đọc thẳng phím đang giữ (core/keys.js) nên mất tiêu điểm cửa sổ (keys.clear) cũng tự thả.
export function updateBigPunch() {
  const big = state.bigPunch;
  const down = keys.has(BIG_PUNCH.key);
  const now = performance.now();
  if (big.charging) {
    const config = settings();
    const held = now - big.startedAt;
    big.charge = config ? Math.min(1, held / config.chargeMs) : 0;
    if (!down || !canUse()) stopCharge(now, canUse());
  } else if (down && !big.wasDown && now >= big.readyAt && canUse()) {
    startCharge(now); // phải nhấn mới (không phải đang giữ sẵn từ trước) để hết hồi chiêu không tự tích lực
  }
  big.wasDown = down;
}
