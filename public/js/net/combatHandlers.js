import { state, remotes } from '../state.js';
import { WEAPON_MODELS } from '../entities/weapons/index.js';
import { hitFeedback } from './hitFeedback.js';
import { tracer, muzzleFlash, bulletImpact, explosion } from '../fx/gunEffects.js';
import { launchRocket, removeRocket } from '../fx/rockets.js';
import { muzzlePosition } from '../player/aim.js';
import { playAt } from './positional.js';

const REMOTE_MUZZLE = 0.7; // đạn của người khác bắt đầu cách mắt họ ngần này (mét) theo hướng bắn, cho khỏi như bắn ra từ mặt
const BOOM_SHAKE = 0.3; // rung camera khi đứng sát vụ nổ, nhỏ dần theo khoảng cách
const BOOM_SHAKE_RANGE = 3; // còn rung trong khoảng ngần này lần bán kính nổ

const point = ([x, y, z]) => ({ x, y, z });

// Vụ nổ bán kính `r` tại `at` (tên lửa, lựu đạn): quả cầu lửa, tiếng nổ, rung camera nếu đứng gần.
export function blastFeedback(at, r) {
  explosion(at, r);
  const pos = point(at);
  playAt('explosion', pos);
  const dist = Math.hypot(pos.x - state.me.x, pos.y - state.me.y, pos.z - state.me.z);
  state.shake = Math.max(state.shake, BOOM_SHAKE * Math.max(0, 1 - dist / (r * BOOM_SHAKE_RANGE)));
}

export const combatHandlers = {
  punch(m) {
    const r = remotes.get(m.id);
    if (m.id === state.myId || !r) return;
    r.fists[m.hand].punch((state.weaponTypes[r.weapon]?.cooldown ?? 350) / 1000); // đòn nhanh thì hoạt ảnh tua nhanh theo
    playAt(WEAPON_MODELS[r.weapon]?.swingSound ?? 'whoosh', r.root.position);
  },

  // Bị trúng đòn / đạn / sức nổ. `by` là null nếu người bắn đã thoát. Toàn bộ phản hồi nằm ở net/hitFeedback.js.
  hit: hitFeedback,

  // Một phát súng: vệt đạn từ đầu nòng tới chỗ dừng. Lửa đầu nòng và tiếng súng của mình đã có lúc bóp cò (player/attack.js).
  shot(m) {
    let from = m.from;
    if (m.id === state.myId) {
      const muzzle = muzzlePosition();
      from = [muzzle.x, muzzle.y, muzzle.z];
    } else {
      const d = m.to.map((v, i) => v - m.from[i]);
      const length = Math.hypot(...d) || 1;
      from = m.from.map((v, i) => v + (d[i] / length) * Math.min(REMOTE_MUZZLE, length));
      muzzleFlash(...from);
      playAt(WEAPON_MODELS[m.w]?.shotSound ?? 'pistolShot', point(from));
    }
    tracer(from, m.to);
    if (m.impact) bulletImpact(m.to);
  },

  rocket(m) {
    launchRocket(m);
    if (m.by !== state.myId) playAt(WEAPON_MODELS[m.w]?.shotSound ?? 'rocketLaunch', point(m.from));
  },

  boom(m) {
    removeRocket(m.id);
    blastFeedback(m.at, m.r);
  },
};
