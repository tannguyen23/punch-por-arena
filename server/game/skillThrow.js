const { PITCH_LIMIT } = require('../config');
const { clamp } = require('../utils/math');
const { broadcast } = require('../net/messaging');
const { WEAPONS, throwRules } = require('./weapons');
const { takeActive } = require('./inventory');
const { isPlaying } = require('./match');
const { cantAct } = require('./restrictions');
const { applyDamage } = require('./damage');
const { eyeOf, aimDirection } = require('./raycast');
const { handOrigin, launch, fly } = require('./trajectory');

const pack = (v) => [v.x, v.y, v.z].map((n) => +n.toFixed(2));

// Tin nhắn 'skillthrow' { yaw, pitch }: ném vũ khí đang cầm đi (phải có `throwSkill`). Vũ khí rời túi và mất luôn, về tay không.
// Trúng người thì trừ máu ngay (như súng); mọi người nhận 'skillthrow' để vẽ vũ khí bay theo đúng quỹ đạo và thời gian đó.
function handleSkillThrow(room, p, m) {
  if (!Number.isFinite(m.yaw) || !Number.isFinite(m.pitch)) return;
  const rules = throwRules(WEAPONS[p.weapon]);
  const now = Date.now();
  if (!rules || !isPlaying(room) || p.dead || cantAct(room, p) || p.reload || now - p.lastAttack < rules.cooldownMs) return;
  p.lastAttack = now;
  p.yaw = m.yaw;
  const weapon = p.weapon;
  if (!takeActive(p)) return;
  const dir = aimDirection(m.yaw, clamp(m.pitch, -PITCH_LIMIT, PITCH_LIMIT));
  const flight = launch(handOrigin(eyeOf(p), m.yaw, rules.hand), dir, rules);
  const { duration, hit } = fly(room, flight, rules, p);
  broadcast(room, {
    t: 'skillthrow', id: p.id, w: weapon, from: pack(flight.from), velocity: pack(flight.velocity),
    gravity: rules.gravity, duration: Math.round(duration), hit: hit?.id ?? null,
  });
  if (hit) applyDamage(room, p, hit, rules.damage);
}

module.exports = { handleSkillThrow };
