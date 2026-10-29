import { state } from '../state.js';
import { POTION } from '../config.js';
import { flashPotion } from '../ui/potionFlash.js';
import * as Sfx from '../audio/sfx.js';

// Hiệu ứng trên máy mình lúc thuốc đổi (gọi từ net/snapshot.js khi id thuốc trong snapshot khác lúc trước): màn hình loé màu nước thuốc,
// góc nhìn giãn ra (to) / thu lại (nhỏ), camera rung (to rung mạnh hơn), có tiếng. Hết thuốc thì làm ngược lại và nhẹ hơn.
// `prev`, `next`: id thuốc trước và sau (0 = không có). Đổi từ thuốc này sang thuốc kia thì tính như vừa uống `next`.
export function potionChanged(prev, next) {
  const id = next || prev;
  const type = state.potionTypes[id];
  if (!type) return;
  state.bigPunch.readyAt = 0; // server cũng đặt lại hồi chiêu đấm trời giáng mỗi khi thuốc đổi (potions.js)
  const drinking = Boolean(next);
  const growing = type.scale > 1;
  const strength = drinking ? 1 : POTION.fx.endStrength;
  const widen = growing === drinking ? 1 : -1; // to ra (uống thuốc to, hoặc hết thuốc nhỏ) thì giãn góc nhìn
  state.potionFov = widen * POTION.fx.fov * strength;
  state.shake = Math.max(state.shake, POTION.fx.shake * strength * (growing ? 1 : POTION.fx.shrinkShakeMult));
  flashPotion(POTION.liquid[id] ?? '#ffffff', strength);
  Sfx.potionChange(growing, drinking);
}
