const { BOT } = require('../config');
const { allRooms } = require('./rooms');
const { thinkBot } = require('./botBrain');

// Vòng lặp suy nghĩ của mọi bot trong mọi phòng. Lỗi của một bot chỉ được ghi lại, không được làm dừng vòng lặp (sập bot của cả server).
function startBotLoop() {
  return setInterval(() => {
    const now = Date.now();
    for (const room of allRooms()) {
      for (const p of room.players.values()) {
        if (!p.bot) continue;
        try {
          thinkBot(room, p, now);
        } catch (err) {
          console.error('Lỗi bot:', err.message);
        }
      }
    }
  }, BOT.tickMs);
}

module.exports = { startBotLoop };
