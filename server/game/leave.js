const { broadcast } = require('../net/messaging');
const { removeIfEmpty } = require('./rooms');

// Một người rời phòng (thoát, mất kết nối hoặc bị kick). Chủ phòng thoát thì quyền chủ phòng chuyển cho người vào phòng sớm nhất còn lại
// (`room.players` giữ thứ tự vào phòng), tên hiện trong danh sách phòng đổi theo.

function passHost(room, leaving) {
  if (room.ownerId !== leaving.id) return;
  const next = room.players.values().next().value;
  if (!next) return;
  room.ownerId = next.id;
  room.ownerName = next.name;
  broadcast(room, { t: 'host', id: next.id, name: next.name });
}

// Gọi nhiều lần cho cùng một người cũng không sao (lần sau không làm gì). `kicked`: báo cho cả phòng là bị mời ra, không phải tự thoát.
function leaveRoom(p, { kicked = false } = {}) {
  const { room } = p;
  if (!p.joined || !room || !room.players.delete(p.id)) return;
  p.joined = false; // tin nhắn tới sau đó không còn tác dụng lên phòng
  p.room = null;
  passHost(room, p);
  broadcast(room, { t: 'leave', id: p.id, ...(kicked ? { kicked: true } : {}) });
  removeIfEmpty(room);
}

module.exports = { leaveRoom };
