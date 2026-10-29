import { state } from '../state.js';
import { keys } from '../core/keys.js';
import { isFrozen } from '../core/freeze.js';
import { send } from '../net/socket.js';
import { POOP } from '../config.js';

// Con chó bấm POOP.key để thả một cục shit sau lưng (server/game/poop.js kiểm tra số cục, giãn cách và vị trí; cục shit hiện ra khi server báo
// tin 'poop'). Phải nhấn mới (không phải giữ sẵn từ trước) nên giữ phím không thả liên tục. Gọi mỗi khung hình.
export function updatePoop() {
  const down = keys.has(POOP.key);
  if (down && !state.poopWasDown && state.dog && state.alive && !isFrozen() && state.match.phase === 'playing' && state.poopCharges > 0) {
    send({ t: 'poop' });
  }
  state.poopWasDown = down;
}
