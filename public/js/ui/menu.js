// Menu và tuỳ chỉnh cạnh nhau; mỗi lần tải trang random ngoại hình, giữ tên và ảnh mặt.
import { loadProfile, saveProfile } from './profileStorage.js';
import { initCustomize, openCustomize } from './customize.js';
import { stopPreview } from './preview.js';
import { initRoomList, setRoomListActive } from './roomList.js';
import { DEFAULT_LOOK, KICKED_NOTICE_KEY } from '../config.js';
import { initGuide } from './guide.js';
import { randomLook } from './lookOptions.js';

const ERRORS = {
  room_not_found: 'Không tìm thấy phòng này',
  room_full: 'Phòng đã đầy',
  bad_code: 'Mã phòng gồm 3 chữ số',
  bad_maps: 'Hãy chọn ít nhất một map hợp lệ',
  server_full: 'Máy chủ đã hết phòng, thử lại sau',
  kicked: 'Bạn đã bị chủ phòng mời ra khỏi phòng',
};
const NAME_REQUIRED = 'Hãy nhập tên trước khi chơi';
const PANELS = ['home', 'play'];

const errorEl = document.getElementById('menu-error');

function showPanel(name) {
  for (const panel of PANELS) document.getElementById(`menu-${panel}`).hidden = panel !== name;
  setRoomListActive(name === 'play'); // chỉ hỏi server danh sách phòng khi đang xem nó
}

// Server từ chối cho vào phòng: hiện lý do ở màn hình chọn phòng để người chơi thử lại.
export function showMenuError(reason) {
  showPanel('play');
  errorEl.textContent = ERRORS[reason] ?? 'Không vào được phòng';
}

// Đã vào phòng: ẩn menu và tắt khung xem trước.
export function hideMenu() {
  document.getElementById('menu').style.display = 'none';
  stopPreview();
}

// Link mời (?room=427): mã phòng 3 chữ số, hoặc '' nếu không có.
const invitedCode = () => (new URLSearchParams(location.search).get('room') ?? '').replace(/\D/g, '').slice(0, 3);

// onJoin(name, look, intent) được gọi khi bấm "Tạo phòng" (intent = { create: true }) hoặc "Vào phòng" (intent = { room }).
export function initMenu(onJoin) {
  initGuide();
  const saved = loadProfile();
  const look = { ...DEFAULT_LOOK, ...randomLook(), face: saved?.look?.face ?? null };
  const nameInput = document.getElementById('name');
  const nameError = document.getElementById('name-error');
  const roomInput = document.getElementById('room-code');
  const startButton = document.getElementById('start');
  nameInput.value = typeof saved?.name === 'string' ? saved.name : '';

  const save = () => saveProfile({ name: nameInput.value.trim(), look });
  initCustomize(look, save);
  openCustomize();

  // Tên là bắt buộc: thiếu thì quay về màn hình đầu và nhắc.
  const requireName = () => {
    const name = nameInput.value.trim();
    nameError.textContent = name ? '' : NAME_REQUIRED;
    if (!name) {
      showPanel('home');
      nameInput.focus();
    }
    return name;
  };

  // Map xoay vòng: danh sách map lấy từ server, người tạo phòng chọn những map sẽ xoay vòng sau mỗi round.
  const createButton = document.getElementById('create');
  const mapOptionsEl = document.getElementById('map-options');
  const selectedMaps = new Set();
  createButton.disabled = true;

  fetch('/api/maps')
    .then((response) => {
      if (!response.ok) throw new Error(`Không tải được danh sách map (${response.status})`);
      return response.json();
    })
    .then((maps) => {
      if (!Array.isArray(maps) || maps.length === 0) throw new Error('Máy chủ chưa có map nào');
      mapOptionsEl.replaceChildren();
      for (const map of maps) {
        const label = document.createElement('label');
        label.className = 'map-option';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = map.id;
        checkbox.checked = true;
        selectedMaps.add(map.id);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) selectedMaps.add(map.id);
          else selectedMaps.delete(map.id);
          createButton.disabled = selectedMaps.size === 0;
        });
        const name = document.createElement('span');
        name.textContent = map.name;
        label.append(checkbox, name);
        mapOptionsEl.append(label);
      }
      createButton.disabled = false;
    })
    .catch((error) => {
      mapOptionsEl.textContent = 'Không tải được danh sách map. Hãy tải lại trang.';
      errorEl.textContent = error.message;
    });

  const submit = (intent) => {
    const name = requireName();
    if (!name) return;
    errorEl.textContent = '';
    save();
    onJoin(name, { ...look }, intent);
  };
  const joinRoom = () => {
    if (!/^\d{3}$/.test(roomInput.value)) {
      errorEl.textContent = ERRORS.bad_code;
      roomInput.focus();
      return;
    }
    submit({ room: roomInput.value });
  };

  // Tạo phòng mới với các map đã chọn (xoay vòng sau mỗi round).
  const createRoom = () => {
    if (selectedMaps.size === 0) {
      errorEl.textContent = ERRORS.bad_maps;
      return;
    }
    submit({ create: true, mapIds: [...selectedMaps] });
  };

  initRoomList((code) => submit({ room: code })); // bấm "Vào" ở một phòng trong danh sách

  // Mở link mời: "Bắt đầu" vào thẳng phòng được mời (vẫn điền sẵn mã ở màn hình chọn phòng nếu vào không được).
  const invited = invitedCode();
  roomInput.value = invited;
  if (invited.length === 3) {
    startButton.textContent = `Vào phòng ${invited}`;
    startButton.classList.add('invited');
    document.getElementById('join').classList.add('invited');
    document.getElementById('menu-invite').textContent = `Bạn được mời vào phòng ${invited}`;
  }
  const start = () => {
    if (!requireName()) return;
    if (invited.length === 3) submit({ room: invited });
    else showPanel('play');
  };

  startButton.addEventListener('click', start);
  nameInput.addEventListener('input', () => {
    if (nameInput.value.trim()) nameError.textContent = '';
    save();
  });
  nameInput.addEventListener('keydown', (e) => e.key === 'Enter' && start());
  document.getElementById('play-back').addEventListener('click', () => showPanel('home'));
  createButton.addEventListener('click', createRoom);
  document.getElementById('join').addEventListener('click', joinRoom);
  roomInput.addEventListener('input', () => {
    roomInput.value = roomInput.value.replace(/\D/g, '').slice(0, 3); // chỉ nhận chữ số
  });
  roomInput.addEventListener('keydown', (e) => e.key === 'Enter' && joinRoom());

  // Vừa bị chủ phòng kick (net/roomHandlers.js tải lại trang về menu): báo lý do ở màn hình chọn phòng, một lần.
  try {
    if (sessionStorage.getItem(KICKED_NOTICE_KEY)) {
      sessionStorage.removeItem(KICKED_NOTICE_KEY);
      showMenuError('kicked');
    }
  } catch { /* trình duyệt chặn sessionStorage: không báo */ }

  // Chế độ test (?autoplay): vào thẳng phòng mới, không cần nhập tên hay bấm nút. Server test (scripts/test-events.js)
  // cho mọi tab vào chung một phòng, tự xếp map và tự sẵn sàng.
  if (new URLSearchParams(location.search).has('autoplay')) {
    const base = (saved?.name?.trim() || 'Tester').slice(0, 12);
    onJoin(`${base} ${10 + Math.floor(Math.random() * 90)}`, { ...look }, { create: true });
  }
}
