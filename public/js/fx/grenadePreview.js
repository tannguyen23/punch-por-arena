import { state } from '../state.js';
import { predictThrow } from '../core/throwPath.js';
import { makePreview, throwWorld } from './previewStyle.js';

// Đường xem trước lúc giữ chuột ngắm lựu đạn (xem previewStyle.js), hoặc null: cùng cách tính với server nhưng chỉ tới chỗ chạm đất / tường
// đầu tiên, không đoán nảy và lăn. Ném từ mắt (không từ bàn tay), chếch lên `liftAngle`; ném nhẹ thì tốc độ nhỏ hơn.
export function grenadePreview() {
  const rules = state.weaponTypes[state.weapon]?.grenade;
  if (!state.grenadeAim || !rules) return null;
  const eye = { ...state.me, y: state.me.y + (state.crouching ? rules.crouchEyeHeight : rules.eyeHeight) * state.size };
  const speed = rules.speed * (state.grenadeAim.soft ? rules.softMult : 1);
  const path = predictThrow(eye, state.yaw, state.pitch - rules.liftAngle, { ...rules, speed, lift: 0 }, throwWorld());
  return makePreview(path, { waiting: state.cooldown > 0 });
}
