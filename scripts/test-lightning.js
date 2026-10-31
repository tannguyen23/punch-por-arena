const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/tableGame');
const { LIGHTNING, MATCH_TICK_MS } = require('../server/config');
const { runLightning, clearLightning } = require('../server/game/lightning');
const { tickWeather } = require('../server/game/weather');
const { isStunned, isHeld, cantAct } = require('../server/game/restrictions');
const { applyClientState } = require('../server/game/movement');
const { selectSlot } = require('../server/game/inventory');
const { buildSnapshot } = require('../server/game/snapshot');
const { respawn } = require('../server/game/spawn');
const { applyDamage } = require('../server/game/damage');
const { endMatch } = require('../server/game/match');
const { Room } = require('../server/game/Room');
const { getMap } = require('../server/maps');

function start(t) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const fixture = setup();
  fixture.room.phase = 'playing';
  fixture.room.endsAt = Date.now() + 300000;
  return fixture;
}

function hit(room, p) {
  room.nextStrikeAt = Infinity;
  room.strikes.push({ x: p.x, z: p.z, y: p.y, at: Date.now() });
  runLightning(room, Date.now());
}

test('Mỗi đợt đủ waveCount tia trong 5 giây; báo trước, rải nhiều vùng và nghỉ 8 giây sau tia cuối', (t) => {
  const { room, players: [a] } = start(t);
  let seed = 42;
  t.mock.method(Math, 'random', () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296));
  const beganAt = Date.now();
  const times = [];
  for (let elapsed = 0; elapsed <= 15000; elapsed += MATCH_TICK_MS) {
    const count = a.messages.filter((m) => m.t === 'lightning').length;
    runLightning(room, Date.now());
    if (a.messages.filter((m) => m.t === 'lightning').length > count) times.push(Date.now() - beganAt);
    t.mock.timers.tick(MATCH_TICK_MS);
  }
  const messages = a.messages.filter((m) => m.t === 'lightning');
  const last = LIGHTNING.waveCount - 1; // tia cuối của đợt đầu; tia kế tiếp (chỉ số waveCount) mở đợt mới
  assert.equal(times[0], 0);
  assert.equal(times[last], LIGHTNING.waveMs);
  assert.ok(times[last + 1] - times[last] - LIGHTNING.warnMs >= LIGHTNING.waveGapMs);
  assert.ok(times[last + 1] - times[last] - LIGHTNING.warnMs < LIGHTNING.waveGapMs + MATCH_TICK_MS);
  assert.ok(times.slice(1, last + 1).every((time, i) => time > times[i]));
  assert.ok(messages.every((m) => m.in === LIGHTNING.warnMs && m.at.every(Number.isFinite)));
  const points = messages.slice(0, LIGHTNING.waveCount).map((m) => m.at);
  assert.ok(points.every((p, i) => points.slice(0, i).every((q) => Math.hypot(p[0] - q[0], p[2] - q[2]) > LIGHTNING.pointGap - 0.02)));
});

test('Đảo trời không đánh xuống hư không; huỷ sạch tia chờ và trạng thái đợt, phòng khác độc lập', (t) => {
  const { room } = start(t);
  const island = new Room('101', ['sky-islands'], getMap('sky-islands'));
  runLightning(room, Date.now());
  for (let i = 0; i < LIGHTNING.waveCount; i++) {
    runLightning(island, Date.now());
    assert.ok(island.strikes.every((s) => Number.isFinite(island.terrain.groundAt(s.x, s.z, Infinity))));
    t.mock.timers.tick(Math.ceil(LIGHTNING.waveMs / (LIGHTNING.waveCount - 1)));
  }
  assert.equal(island.nextStrikeId, LIGHTNING.waveCount + 1);
  clearLightning(room);
  assert.equal(room.strikes.length, 0);
  assert.equal(room.lightningWave, null);
  assert.equal(room.nextStrikeAt, 0);
  assert.equal(room.lastTargetedAt.size, 0);
  assert.ok(island.strikes.length > 0);
});

test('Trúng sét mất máu và choáng đúng 2 giây: chặn vị trí, hành động, đổi ô; đồng bộ và hồi phục', (t) => {
  const { room, players: [a] } = start(t);
  a.slots[0] = { weapon: 'pistol', ammo: 8 };
  a.bigChargeAt = Date.now();
  a.sprinting = true;
  hit(room, a);
  assert.equal(a.hp, 100 - LIGHTNING.damage);
  assert.equal(a.stunnedUntil, Date.now() + LIGHTNING.stunMs);
  assert.equal(a.bigChargeAt, 0);
  assert.equal(a.sprinting, false);
  assert.equal(buildSnapshot(room).players.find((p) => p.id === a.id).st, 2000);
  assert.ok(a.messages.some((m) => m.t === 'stun' && m.id === a.id && m.ms === 2000));
  assert.ok(isHeld(room, a) && cantAct(room, a));
  const oldX = a.x;
  applyClientState(room, a, { x: oldX + 1, z: a.z, y: a.y, yaw: a.yaw });
  selectSlot(a, 0);
  assert.equal(a.x, oldX);
  assert.equal(a.weapon, 'fist');
  t.mock.timers.tick(1999);
  assert.ok(isStunned(a));
  t.mock.timers.tick(1);
  assert.equal(isStunned(a), false);
  assert.equal(cantAct(room, a), false);
  assert.equal(buildSnapshot(room).players.find((p) => p.id === a.id).st, 0);
  selectSlot(a, 0);
  assert.equal(a.weapon, 'pistol');
  applyClientState(room, a, { x: oldX + 1, z: a.z, y: a.y, yaw: a.yaw });
  assert.equal(a.x, oldX + 1);
});

test('Không choáng khi miễn nhiễm TNT / intro / bàn cờ / võ sĩ solo hoặc dưới cầu', (t) => {
  const { room, players: [a, b] } = start(t);
  const guards = [
    () => { room.event = { kind: 'tnt', targetId: a.id }; },
    () => { room.frozenUntil = Date.now() + 1000; },
    () => { a.tableId = 0; },
    () => { room.event = { kind: 'duel', fighters: [a.id, b.id], teams: [[a.id], [b.id]], fighting: true }; },
    () => { t.mock.method(room.terrain, 'bridgeAt', () => ({ deckY: a.y + 2 })); },
  ];
  for (const guard of guards) {
    guard();
    hit(room, a);
    assert.equal(a.hp, 100);
    assert.equal(a.stunnedUntil, 0);
    room.event = null;
    room.frozenUntil = 0;
    a.tableId = null;
  }
  assert.equal(a.messages.filter((m) => m.t === 'stun' && m.id === a.id).length, 0);
});

test('Ngoài bán kính không mất máu hay choáng; tia đánh chết không phát choáng', (t) => {
  const { room, players: [a] } = start(t);
  room.nextStrikeAt = Infinity;
  room.strikes.push({ x: a.x + LIGHTNING.radius, z: a.z, y: a.y, at: Date.now() });
  runLightning(room, Date.now());
  assert.equal(a.hp, 100);
  assert.equal(a.stunnedUntil, 0);
  a.hp = 1;
  hit(room, a);
  assert.ok(a.dead);
  assert.equal(a.stunnedUntil, 0);
  assert.equal(a.messages.filter((m) => m.t === 'stun' && m.id === a.id).length, 0);
});

test('Sự kiện solo ngưng sét: bỏ tia đã báo, không báo tia mới hay mở bão; xong sự kiện sét chạy lại', (t) => {
  const { room, players: [a, b] } = start(t);
  const now = Date.now();
  room.weather = { storm: true, endsAt: now + 60000, nextAt: now };
  runLightning(room, now);
  assert.equal(room.strikes.length, 1);
  const sent = a.messages.filter((m) => m.t === 'lightning').length;
  assert.equal(sent, 1);

  room.event = { kind: 'duel', fighters: [a.id, b.id], teams: [[a.id], [b.id]], fighting: true, introEndsAt: now, endsAt: now + 60000 };
  tickWeather(room, now);
  assert.equal(room.strikes.length, 0);
  assert.equal(room.lightningWave, null);
  assert.equal(room.nextStrikeAt, 0);

  const hp = a.hp;
  t.mock.timers.tick(LIGHTNING.warnMs + MATCH_TICK_MS); // quá giờ tia đã báo trước khi sự kiện bắt đầu
  for (let i = 0; i < 40; i++) {
    tickWeather(room, Date.now());
    assert.equal(room.strikes.length, 0);
    t.mock.timers.tick(MATCH_TICK_MS);
  }
  assert.equal(a.messages.filter((m) => m.t === 'lightning').length, sent);
  assert.equal(a.hp, hp);

  // Hết solo mà bão vẫn còn: sét chạy lại bình thường.
  room.event = null;
  tickWeather(room, Date.now());
  assert.ok(room.strikes.length > 0);
  assert.ok(a.messages.filter((m) => m.t === 'lightning').length > sent);

  // Chưa bão mà đang solo: không mở cơn bão mới.
  room.weather = { storm: false, endsAt: 0, nextAt: Date.now() };
  room.event = { kind: 'duel', fighters: [a.id, b.id], teams: [[a.id], [b.id]], fighting: true };
  t.mock.method(Math, 'random', () => 0); // nếu không ngưng thì xác suất này luôn mở bão
  tickWeather(room, Date.now());
  assert.equal(room.weather.storm, false);
  assert.ok(room.weather.nextAt > Date.now());
});

test('Trúng lại làm mới thời gian choáng; chết, hồi sinh và hết trận đều gỡ choáng', (t) => {
  const { room, players: [a] } = start(t);
  hit(room, a);
  t.mock.timers.tick(1000);
  hit(room, a);
  assert.equal(a.stunnedUntil, Date.now() + 2000);
  applyDamage(room, null, a, 100);
  assert.equal(a.stunnedUntil, 0);
  respawn(room, a);
  assert.equal(a.stunnedUntil, 0);
  hit(room, a);
  endMatch(room);
  assert.equal(a.stunnedUntil, 0);
});
