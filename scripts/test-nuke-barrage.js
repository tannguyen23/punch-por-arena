const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Room } = require('../server/game/Room');
const { getMap } = require('../server/maps');
const { planBarrage } = require('../server/game/nuke');
const { NUKE_AREA } = require('../server/config');

test('Oanh kích nhiều quả phủ ≥70% diện tích đất trên mọi map', () => {
  for (const id of ['default', 'desert', 'sky-islands']) {
    const room = new Room('1', [id], getMap(id));
    const plan = planBarrage(room, [0, 0, 0]);
    assert.ok(plan.points.length >= Math.min(4, NUKE_AREA.bombs), `${id}: chỉ có ${plan.points.length} quả`);
    assert.ok(plan.coverage >= NUKE_AREA.coverage, `${id}: chỉ phủ ${plan.coverage}`);
    assert.ok(plan.radius >= NUKE_AREA.minRadius && plan.radius <= NUKE_AREA.maxRadius, `${id}: bán kính ${plan.radius}`);
    for (const p of plan.points) assert.ok(room.terrain.isDry(p.at[0], p.at[2]), `${id}: bom ngoài đất (${p.at[0]}, ${p.at[2]})`);
  }
});
