const { broadcast, send } = require('../net/messaging');
const { removeIfEmpty } = require('./rooms');
const { closeTable } = require('./tableGames');
const { removeBots, hasHumans } = require('./botRoster');

// Một người rời phòng (thoát, mất kết nối hoặc bị kick). Chủ phòng thoát thì quyền chủ phòng chuyển cho người vào phòng sớm nhất còn lại
// (`room.players` giữ thứ tự vào phòng), tên hiện trong danh sách phòng đổi theo.

function passHost(room, leaving) {
  if (room.ownerId !== leaving.id) return;
  const next = [...room.players.values()].find((o) => !o.bot); // bot không làm chủ phòng
  if (!next) return;
  room.ownerId = next.id;
  room.ownerName = next.name;
  broadcast(room, { t: 'host', id: next.id, name: next.name });
}

// Phòng không còn người chơi: khán giả không ngồi lại phòng đã xoá. Client nhận 'roomclosed' rồi về menu (net/roomHandlers.js).
function closeObservers(room) {
  for (const o of room.observers.values()) {
    o.joined = false;
    o.room = null;
    send(o.ws, { t: 'roomclosed' });
    o.ws.close(4002, 'room closed');
  }
  room.observers.clear();
}

// Gọi nhiều lần cho cùng một người cũng không sao (lần sau không làm gì). `kicked`: báo cho cả phòng là bị mời ra, không phải tự thoát.
function leaveRoom(p, { kicked = false } = {}) {
  const { room } = p;
  if (!p.joined || !room) return;
  if (p.spectator) { // khán giả: chỉ rời danh sách xem, không ảnh hưởng phòng
    room.observers.delete(p.id);
    p.joined = false;
    p.room = null;
    return;
  }
  if (!room.players.has(p.id)) return;
  closeTable(room, p.tableId, 'left', p.id);
  room.players.delete(p.id);
  p.tableId = null;
  p.joined = false; // tin nhắn tới sau đó không còn tác dụng lên phòng
  p.room = null;
  passHost(room, p);
  broadcast(room, { t: 'leave', id: p.id, ...(kicked ? { kicked: true } : {}) });
  if (!hasHumans(room)) removeBots(room); // người thật cuối cùng đi thì bot đi theo, phòng mới xoá được
  if (room.players.size === 0) closeObservers(room);
  removeIfEmpty(room);
}

module.exports = { leaveRoom };
