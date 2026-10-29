const { MAX_HP } = require('../config');
const { DEFAULT_WEAPON } = require('./weapons');
const { FIST_SLOT, emptySlots } = require('./inventory');

let nextId = 1; // id người chơi duy nhất trên cả server (không chỉ trong một phòng)

function createPlayer(ws) {
  // Người chơi chỉ được thêm vào một phòng sau khi gửi 'join' (tên + ngoại hình + phòng muốn vào).
  return {
    id: nextId++,
    ws,
    room: null, // Room đang ở
    ready: false, // đã bấm F trong phòng chờ
    x: 0,
    z: 0,
    y: 0, // độ cao chân (tuyệt đối)
    c: 0, // 1 khi đang ngồi
    yaw: 0,
    hp: MAX_HP,
    lastHurtAt: 0, // mốc Date.now() lần bị trúng đòn gần nhất (tính hồi máu, xem regen.js)
    lastCactusDamageAt: 0,
    fallStartedAt: 0,
    regenCarry: 0,
    dead: false,
    kills: 0,
    lastAttack: 0, // mốc Date.now() của đòn đánh / phát bắn gần nhất (tính hồi chiêu)
    slots: emptySlots(), // túi đồ, xem inventory.js
    activeSlot: FIST_SLOT,
    weapon: DEFAULT_WEAPON, // bản sao của ô đang cầm (inventory.js giữ cho khớp)
    ammo: null, // số đạn còn lại của vũ khí đang cầm; null = dùng mãi (tay không, vũ khí cận chiến cũ)
    joined: false,
    name: '',
    look: null,
  };
}

const info = (p) => ({ id: p.id, name: p.name, look: p.look });

module.exports = { createPlayer, info };
