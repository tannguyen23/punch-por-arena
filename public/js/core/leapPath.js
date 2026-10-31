import { arcTo } from './throwPath.js';

// Chọn chỗ rơi của "đấm trời giáng". Cách chọn phải khớp server/game/bigLeap.js (server quyết định chỗ rơi thật, đây chỉ để xem trước).
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Khoảng ngang tới chỗ tia ngắm chạm địa hình (pitch dương là nhìn xuống), Infinity nếu không chạm; khớp groundDistance ở server/game/raycast.js.
function aimGroundDistance(eye, yaw, pitch, rules, world) {
  const cos = Math.cos(pitch);
  const dir = { x: Math.sin(yaw) * cos, y: -Math.sin(pitch), z: Math.cos(yaw) * cos };
  const horizontal = Math.hypot(dir.x, dir.z);
  if (dir.y >= 0 || horizontal < 1e-6) return Infinity;
  for (let t = rules.rayStep; t * horizontal <= rules.maxRange; t += rules.rayStep) {
    if (eye.y + dir.y * t <= world.heightAt(eye.x + dir.x * t, eye.z + dir.z * t)) return t * horizontal;
  }
  return Infinity;
}

function landingAt(from, yaw, dist, limit, world) {
  const x = clamp(from.x + Math.sin(yaw) * dist, -limit, limit);
  const z = clamp(from.z + Math.cos(yaw) * dist, -limit, limit);
  const y = world.groundAt(x, z, Infinity);
  return world.isSupported(x, z) && Number.isFinite(y) ? { x, y, z } : null;
}

// Kế hoạch nhảy { flight, to, valid } (đường bay dạng chung của throwPath.js). Không có chỗ rơi nào có đất đỡ thì valid = false và `to` là chỗ
// ngắm (để vẽ đường đỏ).
export function planLeap(from, eyeY, yaw, pitch, rules, world) {
  const wanted = clamp(aimGroundDistance({ x: from.x, y: eyeY, z: from.z }, yaw, pitch, rules, world), rules.minRange, rules.maxRange);
  let dist = wanted;
  let to = landingAt(from, yaw, dist, world.limit, world);
  while (!to && dist > rules.minRange) {
    dist = Math.max(rules.minRange, dist - rules.backoffStep);
    to = landingAt(from, yaw, dist, world.limit, world);
  }
  const target = to ?? { x: from.x + Math.sin(yaw) * wanted, y: from.y, z: from.z + Math.cos(yaw) * wanted };
  const length = Math.hypot(target.x - from.x, target.z - from.z);
  const apex = Math.min(rules.maxApex, rules.minApex + rules.apexPerMeter * length);
  const flight = arcTo({ x: from.x, y: from.y, z: from.z }, target, Math.round(rules.baseMs + rules.perMeterMs * length), apex);
  return { flight, to: target, valid: Boolean(to) };
}
