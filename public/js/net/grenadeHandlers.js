import { scene } from '../core/scene.js';
import { state, remotes } from '../state.js';
import { addGrenade, removeGrenade } from '../fx/grenades.js';
import { flashBurst } from '../fx/gunEffects.js';
import { blind } from '../ui/blind.js';
import { blastFeedback } from './combatHandlers.js';
import { playAt } from './positional.js';
import * as Sfx from '../audio/sfx.js';
import { FLASHBANG } from '../config.js';

// Bị choáng nặng nhẹ tuỳ hướng nhìn: nhìn thẳng vào quả nổ thì đủ, quay lưng lại vẫn choáng một phần (FLASHBANG.behind).
function facingFactor([x, y, z]) {
  const eye = scene.activeCamera.position;
  const to = new BABYLON.Vector3(x - eye.x, y - eye.y, z - eye.z).normalize();
  const cos = Math.cos(state.pitch);
  const dot = to.x * Math.sin(state.yaw) * cos - to.y * Math.sin(state.pitch) + to.z * Math.cos(state.yaw) * cos;
  if (dot >= FLASHBANG.facingFull) return 1;
  const k = Math.max(0, (dot + 1) / (FLASHBANG.facingFull + 1)); // -1 (sau lưng) → 0, facingFull → 1
  return FLASHBANG.behind + (1 - FLASHBANG.behind) * k;
}

function flashed(m) {
  flashBurst(m.at);
  playAt('flashBang', { x: m.at[0], y: m.at[1], z: m.at[2] });
  const hit = m.hits.find(([id]) => id === state.myId);
  if (!hit || !state.alive) return;
  const strength = hit[1] * facingFactor(m.at);
  if (strength < FLASHBANG.minStrength) return;
  const ms = FLASHBANG.maxMs * strength;
  blind(ms, Math.min(1, 0.4 + strength));
  Sfx.stunned(ms / 1000, strength);
}

export const grenadeHandlers = {
  // Có người ném lựu đạn: vẽ quả lựu đạn bay, người khác thì vung tay ném. Tiếng vung của mình đã có lúc bấm (player/attack.js).
  throw(m) {
    addGrenade(m);
    const r = remotes.get(m.by);
    if (m.by === state.myId || !r) return;
    r.fists.R.punch((state.weaponTypes[m.w]?.cooldown ?? 900) / 1000);
    playAt('whoosh', r.root.position);
  },

  // Hết ngòi: lựu đạn nổ (sát thương do server tính, đi qua 'hit') hoặc lựu đạn choáng (`hits` = ai thấy, mức độ).
  detonate(m) {
    removeGrenade(m.id);
    if (m.hits) flashed(m);
    else blastFeedback(m.at, m.r);
  },
};
