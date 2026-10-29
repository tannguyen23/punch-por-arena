const { send } = require('../net/messaging');
const { leaveRoom } = require('./leave');

// Chủ phòng: người tạo phòng (hoặc người vào sớm nhất còn lại khi chủ thoát, xem leave.js). Chủ phòng được kick người khác ra khỏi phòng.

const KICK_CLOSE_MS = 1000; // client bị kick không chịu đóng kết nối thì server cắt luôn sau ngần này

function assignHost(room, p) {
  room.ownerId = p.id;
  room.ownerName = p.name;
}

// Tin 'kick' { id }: chỉ chủ phòng, chỉ kick người khác trong cùng phòng. Người bị kick nhận tin 'kicked' rồi bị đóng kết nối và không vào lại được
// bằng chính kết nối đó (vào lại phòng thì phải mở kết nối mới). Chưa có cấm vào lại: không có danh tính bền vững để cấm.
function handleKick(room, p, targetId) {
  if (room.ownerId !== p.id || !Number.isInteger(targetId) || targetId === p.id) return;
  const target = room.players.get(targetId);
  if (!target) return;
  target.kicked = true;
  send(target.ws, { t: 'kicked' });
  leaveRoom(target, { kicked: true });
  target.ws.close(4001, 'kicked');
  setTimeout(() => target.ws.terminate(), KICK_CLOSE_MS);
}

module.exports = { assignHost, handleKick };
