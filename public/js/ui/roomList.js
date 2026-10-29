// Danh sách phòng đang mở trong màn hình "Vào chơi" của menu: lấy từ GET /api/rooms (server/game/rooms.js `listRooms`), làm mới mỗi vài giây
// khi màn hình đang mở. Mỗi dòng ghi phòng của ai (người tạo phòng), map, số người và phòng đang ở giai đoạn nào; bấm "Vào" là vào luôn phòng đó.
// Tên người tạo do họ tự nhập nên chỉ gán bằng textContent.

const REFRESH_MS = 3000;
const PHASES = { lobby: 'Đang chờ', countdown: 'Sắp bắt đầu', playing: 'Đang chơi', ended: 'Xem kết quả' };

const listEl = document.getElementById('room-list');

let timer = null;
let pick = () => {};

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderRow(room) {
  const row = el('div', 'room-row');
  const info = el('div', 'room-info');
  info.append(
    el('div', 'room-title', room.owner ? `Phòng của "${room.owner}"` : `Phòng ${room.code}`),
    el('div', 'room-sub', `#${room.code} · ${room.mapName} · ${room.players}/${room.max} người · ${PHASES[room.phase] ?? room.phase}`),
  );
  const join = el('button', 'room-join', room.players >= room.max ? 'Đầy' : 'Vào');
  join.type = 'button';
  join.disabled = room.players >= room.max;
  join.addEventListener('click', () => pick(room.code));
  row.append(info, join);
  return row;
}

async function refresh() {
  try {
    const response = await fetch('/api/rooms', { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    const rooms = await response.json();
    listEl.replaceChildren(...(rooms.length > 0 ? rooms.map(renderRow) : [el('div', 'room-empty', 'Chưa có phòng nào. Hãy tạo phòng mới!')]));
  } catch {
    listEl.replaceChildren(el('div', 'room-empty', 'Không tải được danh sách phòng'));
  }
}

// `onPick(code)`: gọi khi bấm "Vào" ở một phòng.
export function initRoomList(onPick) {
  pick = onPick;
  document.getElementById('room-refresh').addEventListener('click', refresh);
}

// Bật khi màn hình "Vào chơi" mở (tải ngay rồi làm mới định kỳ), tắt khi rời đi để không gọi server vô ích.
export function setRoomListActive(active) {
  clearInterval(timer);
  timer = null;
  if (!active) return;
  refresh();
  timer = setInterval(refresh, REFRESH_MS);
}
