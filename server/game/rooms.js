const { Room } = require('./Room');

const rooms = new Map(); // mã phòng (chuỗi 3 chữ số) → Room

const CODE_MIN = 100; // không dùng mã bắt đầu bằng 0 cho khỏi nhầm khi đọc/gõ
const CODE_COUNT = 900;

// Tạo phòng mới với mã 3 chữ số ngẫu nhiên chưa ai dùng. Null nếu đã hết mã.
function createRoom(mapIds, initialMap) {
  if (rooms.size >= CODE_COUNT) return null;
  let code;
  do {
    code = String(CODE_MIN + Math.floor(Math.random() * CODE_COUNT));
  } while (rooms.has(code));
  const room = new Room(code, mapIds, initialMap);
  rooms.set(code, room);
  return room;
}

const getRoom = (code) => rooms.get(code);
const allRooms = () => rooms.values();

// Phòng trống thì xoá, mã được dùng lại.
function removeIfEmpty(room) {
  if (room.players.size === 0) rooms.delete(room.code);
}

module.exports = { createRoom, getRoom, allRooms, removeIfEmpty };
