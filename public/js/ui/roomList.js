// Danh sách phòng đang mở ngay trên menu chính: lấy từ GET /api/rooms (server/game/rooms.js `listRooms`), làm mới mỗi vài giây
// khi menu đang mở. Mỗi dòng ghi phòng của ai (người tạo phòng), map, số người và phòng đang ở giai đoạn nào; bấm "Vào" là vào luôn phòng đó.
// Tên người tạo do họ tự nhập nên chỉ gán bằng textContent.

const REFRESH_MS = 3000;
const PHASES = { lobby: 'Đang chờ', countdown: 'Sắp bắt đầu', playing: 'Đang chơi', ended: 'Xem kết quả' };

const listEl = document.getElementById('room-list');

let timer = null;
let pick = () => {};
let spectatorMode = false; // khán giả vào được cả phòng đầy (không chiếm chỗ người chơi)

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
  const full = room.players >= room.max && !spectatorMode;
  const join = el('button', 'room-join', full ? 'Đầy' : 'Vào');
  join.type = 'button';
  join.disabled = full;
  join.addEventListener('click', () => pick(room.code));
  row.append(info, join);
  return row;
}

async function refresh() {
  try {
    const response = await fetch('/api/rooms', { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    const rooms = await response.json();
    listEl.replaceChildren(...(rooms.length > 0
      ? rooms.map(renderRow)
      : [el('div', 'room-empty', spectatorMode ? 'Chưa có phòng nào để xem.' : 'Chưa có phòng nào. Hãy tạo phòng mới!')]));
  } catch {
    listEl.replaceChildren(el('div', 'room-empty', 'Không tải được danh sách phòng'));
  }
}

// `onPick(code)`: gọi khi bấm "Vào" ở một phòng. `spectator`: cho vào cả phòng đầy.
export function initRoomList(onPick, spectator = false) {
  pick = onPick;
  spectatorMode = spectator;
  document.getElementById('room-refresh').addEventListener('click', refresh);
}

// Bật khi menu hiện (tải ngay rồi làm mới định kỳ), tắt khi vào phòng để không gọi server vô ích.
export function setRoomListActive(active) {
  clearInterval(timer);
  timer = null;
  if (!active) return;
  refresh();
  timer = setInterval(refresh, REFRESH_MS);
}
