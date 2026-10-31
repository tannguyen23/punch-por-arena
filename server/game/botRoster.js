const { ROOM_MAX_PLAYERS, DEFAULT_BOT_LEVEL } = require('../config');
const { broadcast } = require('../net/messaging');
const { createPlayer, info } = require('./players');
const { sanitizeLook } = require('./sanitize');
const { randomFreePosition } = require('./spawn');

// Thêm / bớt bot trong phòng. Bot là người chơi thật trong `room.players` (mọi luật áp dụng như nhau), chỉ khác là không có kết nối: `ws` giả nuốt
// mọi tin gửi tới, nên các hàm gửi / phát tin không cần biết bot là gì. Bot không bao giờ là chủ phòng và đi cùng người chơi thật cuối cùng.
// File này cố ý nhẹ (không require bộ não botBrain.js) để leave.js dùng được mà không vòng.

const FAKE_SOCKET = { OPEN: 1, readyState: 1, send() {}, close() {}, terminate() {} };

const randomColor = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
const randomLook = () => sanitizeLook({ shirt: randomColor(), pants: randomColor(), glove: randomColor(), skin: randomColor(), hair: randomColor() });

const hasHumans = (room) => [...room.players.values()].some((p) => !p.bot);

// Thêm tối đa `count` bot (chỉ tới khi phòng đầy), cùng một mức `level` cho cả phòng. Mọi người trong phòng nhận tin 'join' như khi có người vào.
// Trả về số bot đã thêm.
function addBots(room, count, level = DEFAULT_BOT_LEVEL) {
  const total = Math.min(count, ROOM_MAX_PLAYERS - room.players.size);
  for (let i = 0; i < total; i++) {
    const p = createPlayer(FAKE_SOCKET);
    room.botCount = (room.botCount ?? 0) + 1;
    Object.assign(p, { bot: true, botLevel: level, name: `Bot ${room.botCount}`, look: randomLook(), room, joined: true, ready: true }, randomFreePosition(room));
    room.players.set(p.id, p);
    broadcast(room, { t: 'join', ...info(p) });
  }
  return Math.max(0, total);
}

// Người thật cuối cùng rời phòng thì bot đi theo (không còn ai nhìn), phòng mới xoá được.
function removeBots(room) {
  for (const p of [...room.players.values()]) {
    if (!p.bot) continue;
    room.players.delete(p.id);
    p.joined = false;
    p.room = null;
  }
}

module.exports = { addBots, removeBots, hasHumans };
