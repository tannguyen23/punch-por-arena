const { LIGHTNING, MAP_MARGIN } = require('../config');
const { broadcast } = require('../net/messaging');
const { applyDamage } = require('./damage');

// Sét trong lúc bão. Nhịp sét tăng theo số người còn sống nhưng có trần; chọn người bị nhắm theo trọng số:
// đứng tụm lại, đứng giữa sông, đứng trên cao thì dễ bị nhắm hơn. Mỗi tia báo trước LIGHTNING.warnMs (client vẽ vòng sáng)
// rồi mới đánh, nên chạy ra khỏi vòng là thoát. Đứng dưới gầm cầu thì không bị sét đánh. Sét không tính điểm cho ai.

// Độ cao tính là "trên cao" theo địa hình của bản đồ phòng đang chơi.
const highGroundOf = (room) => room.terrain.minHeight + (room.terrain.maxHeight - room.terrain.minHeight) * LIGHTNING.highFraction;

const alive = (room) => [...room.players.values()].filter((p) => !p.dead);

// Khoảng chờ tới tia tiếp theo: trung bình theo nhịp mỗi phút, lệch ngẫu nhiên ±50%, không ngắn hơn minGapMs.
function nextGap(count) {
  const perMin = Math.min(LIGHTNING.maxPerMin, LIGHTNING.basePerMin + LIGHTNING.perPlayerPerMin * count);
  return Math.max(LIGHTNING.minGapMs, (60000 / perMin) * (0.5 + Math.random()));
}

function weightOf(room, p, players) {
  const neighbours = players.filter((o) => o !== p && Math.hypot(o.x - p.x, o.z - p.z) < LIGHTNING.crowdRadius).length;
  let weight = 1 + LIGHTNING.crowdWeight * neighbours;
  const ground = room.terrain.heightAt(p.x, p.z);
  if (ground < room.terrain.waterLevel) weight *= LIGHTNING.waterWeight;
  if (ground > highGroundOf(room)) weight *= LIGHTNING.highWeight;
  return weight;
}

// Người bị nhắm (bỏ qua người vừa bị nhắm gần đây), hoặc null = đánh xuống chỗ trống.
function pickTarget(room, now) {
  if (Math.random() < LIGHTNING.missChance) return null;
  const players = alive(room);
  const ready = players.filter((p) => now - (room.lastTargetedAt.get(p.id) ?? -Infinity) >= LIGHTNING.targetCooldownMs);
  const weights = ready.map((p) => weightOf(room, p, players));
  let roll = Math.random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < ready.length; i++) {
    roll -= weights[i];
    if (roll < 0) return ready[i];
  }
  return null;
}

function strikePoint(room, target) {
  const range = room.mapData.size - MAP_MARGIN;
  if (!target) return { x: (Math.random() * 2 - 1) * range, z: (Math.random() * 2 - 1) * range };
  const angle = Math.random() * Math.PI * 2;
  const offset = Math.random() * LIGHTNING.jitter;
  return { x: target.x + Math.cos(angle) * offset, z: target.z + Math.sin(angle) * offset };
}

// Báo trước một tia sét: chỗ đánh (mặt cầu nếu đánh trúng cầu) và còn bao lâu.
function announceStrike(room, now) {
  const target = pickTarget(room, now);
  if (target) room.lastTargetedAt.set(target.id, now);
  const { x, z } = strikePoint(room, target);
  const strike = { id: room.nextStrikeId++, x, z, y: room.terrain.groundAt(x, z, Infinity), at: now + LIGHTNING.warnMs };
  room.strikes.push(strike);
  const pos = [strike.x, strike.y, strike.z].map((v) => +v.toFixed(2));
  broadcast(room, { t: 'lightning', id: strike.id, at: pos, in: LIGHTNING.warnMs, r: LIGHTNING.radius });
}

// Dưới gầm cầu: có mặt cầu ngay trên đầu.
function sheltered(room, p) {
  const bridge = room.terrain.bridgeAt(p.x, p.z);
  return Boolean(bridge) && p.y < bridge.deckY - 0.5;
}

function strike(room, s) {
  for (const p of alive(room)) {
    const dist = Math.hypot(p.x - s.x, p.z - s.z);
    if (dist >= LIGHTNING.radius || sheltered(room, p)) continue;
    const falloff = 1 - (1 - LIGHTNING.edgeMult) * (dist / LIGHTNING.radius);
    applyDamage(room, null, p, LIGHTNING.damage * falloff, 'lightning');
  }
}

// Gọi mỗi nhịp của trận khi đang bão: đánh các tia đã tới giờ, tới hẹn thì báo tia mới.
function runLightning(room, now) {
  room.strikes = room.strikes.filter((s) => {
    if (now < s.at) return true;
    strike(room, s);
    return false;
  });
  if (room.nextStrikeAt === 0) room.nextStrikeAt = now + nextGap(alive(room).length);
  if (now < room.nextStrikeAt) return;
  announceStrike(room, now);
  room.nextStrikeAt = now + nextGap(alive(room).length);
}

// Tạnh / đổi pha: bỏ các tia đã báo mà chưa đánh (client cũng tự dọn khi nhận 'weather' tạnh / 'end' / 'lobby').
function clearLightning(room) {
  room.strikes = [];
  room.nextStrikeAt = 0;
  room.lastTargetedAt.clear();
}

module.exports = { runLightning, clearLightning };
