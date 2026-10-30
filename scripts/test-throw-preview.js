const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { planThrow, inRing } = require('../server/game/duelThrow');
const { audienceView } = require('../server/game/duelAudience');
const { setupDuel, beginDuel } = require('./helpers/duel');

const loadPrediction = () => import(`data:text/javascript;base64,${fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'core', 'throwPath.js')).toString('base64')}`);

test('Preview trùng điểm rơi server trên mọi map, hướng ngắm, ngồi, tường và hư không', async () => {
  const { predictThrow } = await loadPrediction();
  const { getMap, defaultMapIds } = require('../server/maps');
  const { Room } = require('../server/game/Room');
  let cases = 0;
  for (const id of defaultMapIds) {
    const room = new Room('100', [id], getMap(id));
    if (!room.mapData.ring) continue;
    const ev = { ...beginDuel(setupDuel(3).room), audience: { kits: new Map(), flights: new Map() } };
    const rules = audienceView(room, ev, Date.now()).rules;
    for (const crouch of [false, true]) {
      for (const yaw of [0, Math.PI / 2, Math.PI, -1.2]) {
        for (const pitch of [-1.4, -0.3, 0, 0.6, 1.4]) {
          const p = { x: room.mapData.ring.x, z: room.mapData.ring.z - room.mapData.ring.half - 1, c: crouch, potion: null };
          p.y = room.terrain.groundAt(p.x, p.z, Infinity);
          if (!Number.isFinite(p.y)) continue;
          const actual = planThrow(room, p, yaw, pitch);
          const predicted = predictThrow(actual.from, yaw, pitch, rules, {
            ...room.terrain, walls: room.punchBlockers, ring: room.mapData.ring,
          });
          for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(predicted.landing[axis] - actual.landing[axis]) < 1e-8
            || predicted.landing[axis] === actual.landing[axis], `${id}: ${axis}`);
          assert.equal(predicted.valid, actual.landed && inRing(room, actual.landing));
          assert.ok(predicted.points.length >= 2);
          cases++;
        }
      }
    }
  }
  assert.ok(cases >= 40);
});
