import { state } from '../state.js';
import { predictThrow, handOrigin } from '../core/throwPath.js';
import { makePreview, throwWorld } from './previewStyle.js';

// Đường xem trước của skill ném vũ khí: cùng cách tính với quả ném của khán giả (core/throwPath.js) nhưng không có võ đài.
// Trả về { path, color, size } (xem previewStyle.js) khi đang giữ phím ngắm, không thì null. Vẽ ở fx/throwPreview.js.
export function skillPreview() {
  const rules = state.weaponTypes[state.weapon]?.throwSkill;
  if (!state.skillAim || !rules) return null;
  const eye = { ...state.me, y: state.me.y + (state.crouching ? rules.crouchEyeHeight : rules.eyeHeight) * state.size };
  const from = handOrigin(eye, state.yaw, rules.hand); // bay ra từ bàn tay phải đang giơ lên, giống server
  const path = predictThrow(from, state.yaw, state.pitch, rules, throwWorld());
  return makePreview(path, { waiting: state.cooldown > 0 });
}
