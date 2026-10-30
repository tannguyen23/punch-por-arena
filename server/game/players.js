const { MAX_HP } = require('../config');
const { DEFAULT_WEAPON } = require('./weapons');
const { FIST_SLOT, startingSlots } = require('./inventory');

let nextId = 1; // id người chơi duy nhất trên cả server (không chỉ trong một phòng)

function createPlayer(ws) {
  // Người chơi chỉ được thêm vào một phòng sau khi gửi 'join' (tên + ngoại hình + phòng muốn vào).
  return {
    id: nextId++,
    ws,
    room: null, // Room đang ở
    ready: false, // đã bấm F trong phòng chờ
    tableId: null,
    kicked: false, // bị chủ phòng kick: kết nối này không được vào phòng nữa (host.js)
    x: 0,
    z: 0,
    y: 0, // độ cao chân (tuyệt đối)
    c: 0, // 1 khi đang ngồi
    yaw: 0,
    hp: MAX_HP,
    maxHp: MAX_HP, // đổi theo thuốc đang uống (potions.js)
    potion: null, // thuốc đang có hiệu lực: { id, endsAt } (potions.js)
    poopCharges: 0, // số cục shit chó còn thả được (poop.js)
    poopNextAt: 0, // mốc Date.now() hồi thêm một cục; 0 = đã đầy
    lastPoopAt: 0,
    bigChargeAt: 0, // mốc Date.now() bắt đầu giữ phím đấm trời giáng; 0 = không tích lực (bigPunch.js)
    bigPunchReadyAt: 0, // mốc Date.now() dùng lại được đấm trời giáng
    lastHurtAt: 0, // mốc Date.now() lần bị trúng đòn gần nhất (tính hồi máu, xem regen.js)
    lastCactusDamageAt: 0,
    fallStartedAt: 0,
    regenCarry: 0,
    dead: false,
    stunnedUntil: 0,
    kills: 0,
    streak: 0, // số lần hạ gục liên tiếp từ lần chết gần nhất (đủ RADIO_STREAK_KILLS thì gọi được máy bay thả radio)
    score: 0,
    dog: false, // đang hoá chó trong sự kiện: không vũ khí, không đánh / nhặt được (xem dogEvent.js)
    lastAttack: 0, // mốc Date.now() của đòn đánh / phát bắn gần nhất (tính hồi chiêu)
    slots: startingSlots(), // túi đồ, xem inventory.js
    activeSlot: FIST_SLOT,
    weapon: DEFAULT_WEAPON, // bản sao của ô đang cầm (inventory.js giữ cho khớp)
    ammo: null, // số đạn còn lại của vũ khí đang cầm; null = dùng mãi (tay không, vũ khí cận chiến cũ)
    magazine: null,
    reload: null,
    joined: false,
    name: '',
    look: null,
  };
}

const info = (p) => ({ id: p.id, name: p.name, look: p.look });

module.exports = { createPlayer, info };
