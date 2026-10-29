const { TICK_MS } = require('../config');
const { broadcast } = require('../net/messaging');
const { timeLeft } = require('./match');
const { allRooms } = require('./rooms');
const { slotsView } = require('./inventory');
const { grenadesView } = require('./grenades');

function buildSnapshot(room) {
  return {
    t: 'snap',
    ph: room.phase,
    mt: timeLeft(room), // thời gian còn lại của pha hiện tại (đếm ngược / trận / giờ nghỉ), mili giây
    gr: grenadesView(room), // lựu đạn trên sân
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      x: +p.x.toFixed(3),
      z: +p.z.toFixed(3),
      yaw: +p.yaw.toFixed(3),
      y: +p.y.toFixed(2),
      c: p.c,
      sp: !p.dead && !!p.sprinting ? 1 : 0, // cờ chạy; `s` bên dưới là túi đồ
      hp: p.hp,
      dead: p.dead,
      kills: p.kills,
      w: p.weapon,
      a: p.ammo, // số đạn còn lại (null = dùng mãi)
      s: slotsView(p), // túi đồ: [vũ khí, đạn] hoặc 0 từng ô
      as: p.activeSlot, // ô đang cầm (bằng số ô vũ khí = ô tay không)
      r: p.ready ? 1 : 0,
    })),
  };
}

// Mỗi phòng nhận snapshot của riêng nó.
function startSnapshotLoop() {
  return setInterval(() => {
    for (const room of allRooms()) {
      if (room.players.size > 0) broadcast(room, buildSnapshot(room));
    }
  }, TICK_MS);
}

module.exports = { buildSnapshot, startSnapshotLoop };
