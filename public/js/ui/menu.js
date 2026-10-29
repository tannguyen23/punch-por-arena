// Màn hình đầu: nhập tên (bắt buộc) rồi "Bắt đầu" (tạo phòng / vào phòng) hoặc "Tuỳ chỉnh nhân vật" (không bắt buộc:
// chưa chỉnh gì thì mặc ngoại hình mặc định DEFAULT_LOOK, đã chỉnh thì nhớ trong máy).
import { loadProfile, saveProfile } from './profileStorage.js';
import { initCustomize, openCustomize } from './customize.js';
import { stopPreview } from './preview.js';
import { DEFAULT_LOOK } from '../config.js';

const ERRORS = {
  room_not_found: 'Không tìm thấy phòng này',
  room_full: 'Phòng đã đầy',
  bad_code: 'Mã phòng gồm 3 chữ số',
  server_full: 'Máy chủ đã hết phòng, thử lại sau',
};
const NAME_REQUIRED = 'Hãy nhập tên trước khi chơi';
const PANELS = ['home', 'play', 'customize'];

const errorEl = document.getElementById('menu-error');

function showPanel(name) {
  for (const panel of PANELS) document.getElementById(`menu-${panel}`).hidden = panel !== name;
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
  const saved = loadProfile();
  const look = { ...DEFAULT_LOOK, ...saved?.look };
  const nameInput = document.getElementById('name');
  const nameError = document.getElementById('name-error');
  const roomInput = document.getElementById('room-code');
  const startButton = document.getElementById('start');
  nameInput.value = typeof saved?.name === 'string' ? saved.name : '';

  const save = () => saveProfile({ name: nameInput.value.trim(), look });
  initCustomize(look, () => {
    save();
    showPanel('home');
  });

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
  nameInput.addEventListener('input', () => nameInput.value.trim() && (nameError.textContent = ''));
  nameInput.addEventListener('keydown', (e) => e.key === 'Enter' && start());
  document.getElementById('customize-open').addEventListener('click', () => {
    showPanel('customize');
    openCustomize();
  });
  document.getElementById('play-back').addEventListener('click', () => showPanel('home'));
  document.getElementById('create').addEventListener('click', () => submit({ create: true }));
  document.getElementById('join').addEventListener('click', joinRoom);
  roomInput.addEventListener('input', () => {
    roomInput.value = roomInput.value.replace(/\D/g, '').slice(0, 3); // chỉ nhận chữ số
  });
  roomInput.addEventListener('keydown', (e) => e.key === 'Enter' && joinRoom());
}
