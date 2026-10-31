import { state, remotes } from '../state.js';
import { HIT_FX } from '../config.js';
import { spawnHitEffects, hitPower } from '../fx/hitEffects.js';
import { slowMotion } from '../core/timeScale.js';
import { flashDamage, flashCrosshairHit, showDamageNotice } from '../ui/hud.js';
import { showHitDirection } from '../ui/hitDirection.js';
import { hitRing } from '../audio/hitSfx.js';
import { positionOf, playAt } from './positional.js';

const lerp = ([min, max], t) => min + (max - min) * t;
const STOP_GAP_MS = 80; // hit stop cách nhau ít nhất ngần này, nếu không vũ khí đánh nhanh (găng sấm sét 100ms) đứng hình gần như liên tục

// Có đứng hình tay / nhân vật `entity` (remote hoặc state) thêm `ms` không: bỏ qua nếu vừa mới đứng hình xong.
function freeze(entity, field, ms, now) {
  if (now - (entity[field] ?? 0) < STOP_GAP_MS) return;
  entity[field] = now + ms;
}

const weaponKindOf = (id) => state.weaponTypes[id === state.myId ? state.weapon : remotes.get(id)?.weapon]?.kind;

// Camera mình giật theo hướng đòn: bị đánh từ trước thì đầu ngửa ra sau, từ bên phải thì đầu nghiêng/quay sang trái.
function kickCamera(from, power) {
  const k = HIT_FX.kickTaken;
  let forward = 0;
  let right = (Math.random() < 0.5 ? -1 : 1) * 0.6; // không biết ai đánh (sét, rơi...): giật ngẫu nhiên sang một bên
  if (from) {
    const dx = from.x - state.me.x;
    const dz = from.z - state.me.z;
    const len = Math.hypot(dx, dz) || 1;
    forward = (dx * Math.sin(state.yaw) + dz * Math.cos(state.yaw)) / len;
    right = (dx * Math.cos(state.yaw) - dz * Math.sin(state.yaw)) / len;
  }
  state.camKick.pitch -= forward * k.pitch * power;
  state.camKick.yaw -= right * k.yaw * power;
  state.camKick.roll += right * k.roll * power;
}

// Quanh người hạ gục: rung theo khoảng cách (ai đứng gần cũng thấy), quay chậm chỉ cho người trong cuộc.
function koFeedback(m, at) {
  const { ko } = HIT_FX;
  if (at) {
    const dist = Math.hypot(at.x - state.me.x, at.z - state.me.z);
    state.shake = Math.max(state.shake, ko.shake * Math.max(0, 1 - dist / ko.shakeRange));
  }
  if (m.by === state.myId || m.id === state.myId) {
    slowMotion(ko.slowScale, ko.slowMs);
    state.fovKick += ko.fov;
  }
}

// Mọi phản hồi khi có người trúng đòn / đạn / sức nổ (tin 'hit'). Thanh máu, tiếng trúng đòn do file âm thanh riêng; ở đây là cảm giác: hit stop,
// rung / giật camera, chớp model, tia lửa / vòng / bụi / số, chỉ báo hướng, tai ù, quay chậm khi hạ gục.
export function hitFeedback(m) {
  const now = performance.now();
  const power = hitPower(m.dmg);
  const ko = Boolean(m.ko);
  const victimPos = positionOf(m.id);
  const attackerPos = positionOf(m.by);
  playAt('impact', victimPos);

  const victim = remotes.get(m.id);
  victim?.hitFlash?.trigger(power);
  victim?.hit?.(power);

  // Hit stop chỉ cho đòn cận chiến: súng bắn liên thanh sẽ làm mọi thứ đứng hình liên tục.
  if (weaponKindOf(m.by) === 'melee') {
    const ms = lerp(HIT_FX.stopMs, power);
    if (victim) freeze(victim, 'stopUntil', ms, now);
    if (m.by === state.myId) freeze(state, 'handStopUntil', ms, now);
    else if (remotes.get(m.by)) freeze(remotes.get(m.by), 'stopUntil', ms, now);
  }

  if (m.id === state.myId) {
    state.shake = Math.max(state.shake, lerp(HIT_FX.shakeTaken, power));
    flashDamage(power);
    showDamageNotice(m.dmg, m.source);
    kickCamera(attackerPos, power);
    if (attackerPos) showHitDirection(attackerPos.x, attackerPos.z, power);
    if (power >= HIT_FX.tinnitus.minPower || ko) hitRing(HIT_FX.tinnitus.strength * Math.max(power, ko ? 1 : 0));
    if (ko) koFeedback(m, state.me);
    return;
  }

  if (victim) spawnHitEffects(victim, attackerPos ?? state.me, m.dmg, ko);
  if (m.by === state.myId) {
    state.shake = Math.max(state.shake, lerp(HIT_FX.shakeGiven, power));
    state.fovKick += HIT_FX.fovPunch * power;
    state.camKick.pitch += HIT_FX.nodGiven * power;
    flashCrosshairHit();
  }
  if (ko) koFeedback(m, victimPos);
}
