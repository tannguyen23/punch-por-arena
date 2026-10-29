const { FIRE_SLACK_MS, PITCH_LIMIT, GRENADE } = require('../config');
const { clamp } = require('../utils/math');
const { broadcast } = require('../net/messaging');
const { WEAPONS } = require('./weapons');
const { useAmmo, hasAmmo } = require('./inventory');
const { eyeOf, aimDirection } = require('./raycast');
const { moveGrenade } = require('./grenadePhysics');
const { blast } = require('./explosion');
const { flashTargets } = require('./flashbang');
const { freezeGround } = require('./ice');

// Lựu đạn: ném theo cung từ mắt người ném, server mô phỏng đường bay (grenadePhysics.js), hết ngòi thì nổ.
// Vị trí từng quả đi trong snapshot (`gr`), client chỉ vẽ theo. Không require match.js (match.js require file này).

const pack = (v) => [v.x, v.y, v.z].map((n) => +n.toFixed(2));

// Tin nhắn 'throw' { yaw, pitch, soft }: chuột trái ném mạnh, chuột phải (`soft`) tung nhẹ.
function handleThrow(room, p, m) {
  if (!Number.isFinite(m.yaw) || !Number.isFinite(m.pitch)) return;
  const weapon = WEAPONS[p.weapon];
  const now = Date.now();
  if (weapon.kind !== 'throwable' || room.phase !== 'playing' || p.dead || !hasAmmo(p)) return;
  if (now - p.lastAttack < weapon.cooldown - FIRE_SLACK_MS) return;
  p.lastAttack = now;
  p.yaw = m.yaw;
  const dir = aimDirection(m.yaw, clamp(m.pitch, -PITCH_LIMIT, PITCH_LIMIT) - GRENADE.lift);
  const speed = weapon.speed * (m.soft ? GRENADE.softMult : 1);
  const grenade = {
    id: room.nextGrenadeId++,
    ownerId: p.id,
    weapon: p.weapon,
    pos: eyeOf(p),
    vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
    explodeAt: now + weapon.fuse,
  };
  room.grenades.push(grenade);
  broadcast(room, { t: 'throw', id: grenade.id, by: p.id, w: p.weapon, from: pack(grenade.pos), vel: pack(grenade.vel) });
  useAmmo(p); // quả cuối thì ô tự trống (inventory.js)
}

// Nổ: lựu đạn nổ gây sát thương lan như tên lửa; lựu đạn choáng gửi kèm ai bị choáng và mức độ (client tự tính thêm hướng nhìn);
// lựu đạn băng không gây sát thương mà đóng băng mặt đất chỗ quả nằm (ice.js).
function detonate(room, grenade) {
  const weapon = WEAPONS[grenade.weapon];
  const msg = { t: 'detonate', id: grenade.id, w: grenade.weapon, at: pack(grenade.pos), r: weapon.splash };
  if (weapon.effect === 'flash') {
    broadcast(room, { ...msg, hits: flashTargets(room, grenade.pos, weapon.splash) });
    return;
  }
  if (weapon.effect === 'ice') {
    freezeGround(room, grenade, weapon);
    return;
  }
  broadcast(room, msg);
  blast(room, room.players.get(grenade.ownerId) ?? null, grenade.pos, weapon.damage, weapon.splash); // người ném có thể đã thoát
}

// Gọi mỗi nhịp của vòng lặp vật thể bay (projectiles.js).
function stepGrenades(room, dt, now) {
  if (room.grenades.length === 0) return;
  room.grenades = room.grenades.filter((grenade) => {
    if (now < grenade.explodeAt) {
      moveGrenade(grenade, dt);
      return true;
    }
    detonate(room, grenade);
    return false;
  });
}

// Lựu đạn còn trên sân khi đổi pha thì bỏ, không nổ nữa.
function clearGrenades(room) {
  room.grenades = [];
}

// Gửi trong snapshot: [id, vũ khí, x, y, z, vx, vy, vz] để client vẽ và đoán tiếp đường bay giữa hai snapshot.
const grenadesView = (room) => room.grenades.map((g) => [g.id, g.weapon, ...pack(g.pos), ...pack(g.vel)]);

module.exports = { handleThrow, stepGrenades, clearGrenades, grenadesView };
