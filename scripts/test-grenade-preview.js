const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setupDuel } = require('./helpers/duel');
const { handleThrow } = require('../server/game/grenades');
const { moveGrenade } = require('../server/game/grenadePhysics');
const { addToInventory, selectSlot } = require('../server/game/inventory');
const { weaponInfo } = require('../server/game/weapons');

const loadPrediction = () => import(`data:text/javascript;base64,${fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'core', 'throwPath.js')).toString('base64')}`);

// Đường xem trước lựu đạn chỉ tới chỗ chạm đất đầu tiên: phải trùng chỗ quả lựu đạn thật chạm đất lần đầu (trước khi nảy).
test('Preview lựu đạn trùng chỗ chạm đất đầu tiên của server, ném xa và ném nhẹ', async (t) => {
  const { predictThrow } = await loadPrediction();
  const rules = weaponInfo().frag.grenade;
  for (const soft of [false, true]) {
    for (const pitch of [-0.6, -0.2, 0.1, 0.5]) {
      const { room, players: [thrower] } = setupDuel(2);
      room.terrain.heightAt = () => 0;
      room.terrain.groundAt = () => 0;
      room.terrain.isSupported = () => true;
      room.terrain.waterLevel = -10;
      room.punchBlockers = [];
      Object.assign(thrower, { x: 0, y: 0, z: 0, yaw: 0.4, hp: 100, lastAttack: 0, c: 0 });
      room.phase = 'playing';
      room.event = null;
      addToInventory(thrower, 'frag', 2);
      selectSlot(thrower, 0);
      handleThrow(room, thrower, { yaw: 0.4, pitch, soft });
      const grenade = room.grenades[0];
      assert.ok(grenade, 'phải ném được');
      const eye = { x: 0, y: 1.7, z: 0 };
      const speed = rules.speed * (soft ? rules.softMult : 1);
      const predicted = predictThrow(eye, 0.4, pitch - rules.liftAngle, { ...rules, speed, lift: 0 }, {
        groundAt: () => 0, heightAt: () => 0, isSupported: () => true, ring: null, walls: [],
      });
      let landed = null;
      for (let i = 0; i < 400 && !landed; i++) {
        const before = grenade.vel.y;
        moveGrenade(room, grenade, 0.02);
        if (before < 0 && grenade.vel.y > 0) landed = { ...grenade.pos }; // vừa nảy lần đầu
      }
      assert.ok(landed, 'phải chạm đất');
      assert.ok(Math.hypot(predicted.landing.x - landed.x, predicted.landing.z - landed.z) < 0.5,
        `pitch ${pitch}, soft ${soft}: dự đoán (${predicted.landing.x.toFixed(2)}, ${predicted.landing.z.toFixed(2)}) so với (${landed.x.toFixed(2)}, ${landed.z.toFixed(2)})`);
    }
  }
});
