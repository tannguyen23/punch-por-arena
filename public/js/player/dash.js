import { state } from '../state.js';
import { keys } from '../core/keys.js';
import { actionBlocked } from '../core/freeze.js';
import { send } from '../net/socket.js';
import { startLeap, isLeaping } from './leapFlight.js';
import { startGlide, isGliding } from './glide.js';
import { emitLocalTrail } from '../fx/jetFx.js';
import * as Sfx from '../audio/sfx.js';
import { DASH } from '../config.js';

// Dash của động cơ phản lực: bấm DASH.key để lao theo hướng nhìn (có cả ngẩng / cúi). Server quyết định điểm đến, hồi chiêu và chặn tường
// (server/game/dash.js) rồi phát tin 'dash'; máy mình chỉ bay theo kế hoạch đó bằng cú nhảy chung (player/leapFlight.js, net/dashHandlers.js).

const canUse = () => state.alive && !state.spectator && state.match.phase === 'playing' && !actionBlocked() && !isLeaping() && !state.bigPunch.charging;

// Gọi mỗi khung hình. Phải nhấn mới (không phải giữ sẵn) mới dash. Vừa gửi tin thì chờ server trả lời; bị từ chối thì không tốn hồi chiêu.
export function updateDash(dt) {
  const dash = state.dash;
  const down = keys.has(DASH.key);
  const now = performance.now();
  if (down && !dash.wasDown && now >= dash.readyAt && now >= dash.pendingUntil && canUse()) {
    dash.pendingUntil = now + DASH.pendingMs;
    send({ t: 'dash', yaw: state.yaw, pitch: state.pitch });
  }
  dash.wasDown = down;
  const flying = state.leap?.back;
  if (flying) emitLocalTrail(dt, state.me.x, state.me.y + 0.9, state.me.z, flying);
  else if (isGliding()) emitLocalTrail(dt, state.me.x, state.me.y + 0.2, state.me.z, DOWN); // liệng: khí phun xuống dưới chân
}

const DOWN = { x: 0, y: -1, z: 0 };

// Server đã duyệt: bay theo đường `flight` tới `to`; `back` = hướng ngược dash (đơn vị) cho vệt khí; `glide` = { ms, fall, easeMs } liệng xuống chậm sau khi tới nơi.
export function startDash(flight, to, back, cooldownMs, glide) {
  const dash = state.dash;
  dash.cooldownMs = cooldownMs;
  dash.readyAt = performance.now() + cooldownMs;
  dash.pendingUntil = 0;
  startLeap(flight, to);
  state.leap.back = back;
  startGlide(flight.duration, glide.ms, glide.fall, glide.easeMs);
  state.fovKick += DASH.fovKick;
  state.shake = Math.max(state.shake, DASH.shake);
  Sfx.at('dash', 0, 0, 0, 0, 0);
}
