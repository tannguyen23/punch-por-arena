const { ROOM_MAX_PLAYERS } = require('../config');
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

// Danh sách phòng cho menu (GET /api/rooms): phòng đông người lên trước. Chỉ có thông tin công khai, không có gì của người chơi ngoài tên người tạo.
function listRooms() {
  return [...rooms.values()]
    .map((room) => ({ code: room.code, owner: room.ownerName, players: room.players.size, max: ROOM_MAX_PLAYERS, phase: room.phase, mapName: room.mapData.name }))
    .sort((a, b) => b.players - a.players || a.code.localeCompare(b.code));
}

// Đóng mọi kết nối và xoá hết phòng (trang /admin-test áp cấu hình mới: phòng cũ còn luật cũ nên không giữ lại).
function closeAllRooms() {
  const open = [...rooms.values()];
  rooms.clear();
  for (const room of open) {
    for (const p of room.players.values()) p.ws.close();
    for (const o of room.observers.values()) o.ws.close();
  }
}

module.exports = { createRoom, getRoom, allRooms, removeIfEmpty, closeAllRooms, listRooms };
