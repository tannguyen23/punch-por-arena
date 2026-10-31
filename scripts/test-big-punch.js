const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupDuel } = require('./helpers/duel');
const { startCharge, releaseCharge } = require('../server/game/bigPunch');
const { planLeap, leapBounds } = require('../server/game/bigLeap');
const { BIG_PUNCH } = require('../server/config');

function fixture(t, mockTime = true) {
  if (mockTime) t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players: [giant, target] } = setupDuel(2);
  room.terrain.heightAt = () => 0;
  room.terrain.groundAt = () => 0;
  room.terrain.isSupported = () => true;
  room.event = null;
  room.phase = 'playing';
  Object.assign(giant, { x: 0, y: 0, z: 0, yaw: 0, hp: 100, potion: { id: 'grow3', endsAt: Infinity }, bigPunchReadyAt: 0 });
  Object.assign(target, { x: 0, y: 0, z: 20, hp: 400, maxHp: 400 });
  return { room, giant, target };
}

test('Đang cầm vũ khí vẫn gồng và nhảy đấm được (không cần tay không)', (t) => {
  const { room, giant } = fixture(t);
  giant.weapon = 'sword';
  startCharge(room, giant);
  assert.ok(giant.bigChargeAt > 0, 'phải bắt đầu gồng');
  t.mock.timers.tick(100);
  releaseCharge(room, giant, { yaw: 0, pitch: 0.4 });
  const jump = giant.messages.find((m) => m.t === 'bigpunch');
  assert.ok(jump, 'phải nhảy dù đang cầm vũ khí');
  t.mock.timers.tick(jump.duration);
});

test('Nhìn ngang thì nhảy xa tối đa; nhìn xuống thì rơi ở chỗ tia ngắm chạm đất', (t) => {
  const { room, giant } = fixture(t);
  assert.equal(planLeap(room, giant, 0, 0).to.z, BIG_PUNCH.leap.maxRange);
  const plan = planLeap(room, giant, 0, 0.5); // mắt cao 1.7 × 3 = 5.1m
  assert.ok(Math.abs(plan.to.z - 5.1 / Math.tan(0.5)) < BIG_PUNCH.leap.rayStep, `rơi ở ${plan.to.z}`);
  assert.equal(planLeap(room, giant, 0, 1.4).to.z, BIG_PUNCH.leap.minRange);
});

test('Chỗ rơi không có đất đỡ thì lùi về phía người nhảy; không có chỗ nào thì không nhảy', (t) => {
  const { room, giant } = fixture(t);
  room.terrain.isSupported = (x, z) => z < 12;
  assert.ok(planLeap(room, giant, 0, 0).to.z <= 12);
  room.terrain.isSupported = () => false;
  assert.equal(planLeap(room, giant, 0, 0), null);
});

test('Thả ngay vẫn nhảy nhưng yếu; gồng đầy thì mạnh nhất, sóng nổ ở chỗ rơi', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const damageAfter = (heldMs) => {
    const { room, giant, target } = fixture(t, false);
    target.z = 10;
    startCharge(room, giant);
    t.mock.timers.tick(heldMs);
    giant.messages.length = 0;
    releaseCharge(room, giant, { yaw: 0, pitch: 0.4 });
    const jump = giant.messages.find((m) => m.t === 'bigpunch');
    assert.ok(jump, 'phải nhảy');
    assert.ok(jump.duration >= BIG_PUNCH.impactMs);
    assert.ok(leapBounds(giant), 'đang bay thì được phép ở trên cao');
    t.mock.timers.tick(jump.duration);
    assert.equal(giant.leap, null);
    return 400 - target.hp;
  };
  const weak = damageAfter(10);
  const full = damageAfter(BIG_PUNCH.chargeMs);
  assert.ok(weak > 0, 'thả ngay vẫn gây sát thương');
  assert.ok(full > weak * 2, `đầy ${full} so với ${weak}`);
});

test('Chưa gồng mà thả, hoặc đang hồi chiêu thì huỷ, không nhảy', (t) => {
  const { room, giant } = fixture(t);
  releaseCharge(room, giant, { yaw: 0, pitch: 0 });
  assert.ok(giant.messages.some((m) => m.t === 'bigcancel'));
  giant.bigPunchReadyAt = Date.now() + 1000;
  giant.messages.length = 0;
  startCharge(room, giant);
  releaseCharge(room, giant, { yaw: 0, pitch: 0 });
  assert.ok(!giant.messages.some((m) => m.t === 'bigpunch'));
});

// Client (đường xem trước, người nhảy) và server dùng chung một dạng đường bay: phải ra cùng điểm rơi và cùng quỹ đạo.
test('Đường nhảy: server và client chọn cùng điểm rơi, quỹ đạo kết thúc đúng điểm rơi', async (t) => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { positionAt } = require('../server/game/trajectory');
  const read = (name) => fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'core', name), 'utf8');
  const toUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  const throwUrl = toUrl(read('throwPath.js'));
  const { planLeap: clientPlan } = await import(toUrl(read('leapPath.js').replace("'./throwPath.js'", `'${throwUrl}'`)));
  const { room, giant } = fixture(t);
  const world = { ...room.terrain, limit: room.mapData.size - 0.5 };
  for (const pitch of [-0.5, 0, 0.3, 0.7, 1.2]) {
    for (const yaw of [0, 1, -2.5]) {
      const server = planLeap(room, giant, yaw, pitch);
      const eyeY = giant.y + 1.7 * 3;
      const client = clientPlan({ x: giant.x, y: giant.y, z: giant.z }, eyeY, yaw, pitch, BIG_PUNCH.leap, world);
      assert.deepEqual([client.to.x, client.to.z].map((v) => +v.toFixed(6)), [server.to.x, server.to.z].map((v) => +v.toFixed(6)));
      const end = positionAt(server.flight, server.flight.duration / 1000);
      for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(end[axis] - server.to[axis]) < 1e-6, `${axis}: ${end[axis]} so với ${server.to[axis]}`);
    }
  }
});
