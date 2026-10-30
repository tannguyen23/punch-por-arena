const { TICK_MS } = require('../config');
const { broadcast } = require('../net/messaging');
const { timeLeft } = require('./match');
const { allRooms } = require('./rooms');
const { slotsView } = require('./inventory');
const { grenadesView } = require('./grenades');
const { updateReload } = require('./magazines');

function buildSnapshot(room) {
  const now = Date.now();
  for (const p of room.players.values()) updateReload(room, p, now);
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
      mh: p.maxHp, // máu tối đa (đổi theo thuốc)
      pt: p.potion?.id ?? 0, // thuốc đang có hiệu lực (0 = không)
      pl: p.potion ? Math.max(0, p.potion.endsAt - now) : 0, // thuốc còn bao lâu (mili giây)
      dead: p.dead,
      st: p.dead ? 0 : Math.max(0, (p.stunnedUntil ?? 0) - now),
      kills: p.kills,
      ks: p.streak, // chuỗi hạ gục liên tiếp
      score: p.score,
      dg: p.dog ? 1 : 0, // đang hoá chó
      pc: p.dog ? p.poopCharges : 0, // chó còn bao nhiêu cục shit thả được
      pn: p.dog && p.poopNextAt ? Math.max(0, p.poopNextAt - now) : 0, // còn bao lâu (ms) hồi thêm một cục; 0 = đã đầy
      w: p.weapon,
      a: p.ammo, // số đạn còn lại (null = dùng mãi)
      mg: p.magazine,
      rl: p.reload ? Math.max(0, p.reload.endsAt - now) : 0,
      s: slotsView(p), // túi đồ: [vũ khí, tổng đạn, đạn trong băng] hoặc 0 từng ô
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
