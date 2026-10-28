// Màn hình chọn tên và ngoại hình trước khi vào sân.
import { SHIRT, PANTS, GLOVE, SKIN, HAIR, PATTERNS, randomLook } from './lookOptions.js';
import { loadProfile, saveProfile } from './profileStorage.js';
import { initPreview, setPreviewLook, stopPreview } from './preview.js';

const ERRORS = {
  room_not_found: 'Không tìm thấy phòng này',
  room_full: 'Phòng đã đầy',
  bad_code: 'Mã phòng gồm 3 chữ số',
  server_full: 'Máy chủ đã hết phòng, thử lại sau',
};

// Server từ chối cho vào phòng: hiện lý do trong menu để người chơi thử lại.
export function showMenuError(reason) {
  document.getElementById('menu-error').textContent = ERRORS[reason] ?? 'Không vào được phòng';
}

// Đã vào phòng: ẩn menu và tắt khung xem trước.
export function hideMenu() {
  document.getElementById('menu').style.display = 'none';
  stopPreview();
}

// onJoin(name, look, intent) được gọi khi bấm "Tạo phòng" (intent = { create: true }) hoặc "Vào phòng" (intent = { room }).
export function initMenu(onJoin) {
  const saved = loadProfile();
  const state = { look: { ...randomLook(), ...saved?.look } };
  const nameInput = document.getElementById('name');
  nameInput.value = typeof saved?.name === 'string' ? saved.name : '';

  const buttons = [];
  const refresh = () => {
    for (const b of buttons) b.el.classList.toggle('on', state.look[b.key] === b.value);
    setPreviewLook(state.look);
  };
  const addOption = (key, value, className, setup) => {
    const el = document.createElement('button');
    el.className = className;
    setup(el);
    el.addEventListener('click', () => {
      state.look[key] = value;
      refresh();
    });
    document.getElementById('opt-' + key).append(el);
    buttons.push({ el, key, value });
  };

  const swatches = { shirt: SHIRT, pants: PANTS, glove: GLOVE, skin: SKIN, hair: HAIR };
  for (const [key, colors] of Object.entries(swatches)) {
    for (const color of colors) {
      addOption(key, color, 'sw', (el) => {
        el.style.background = color;
      });
    }
  }
  PATTERNS.forEach((label, index) => {
    addOption('pattern', index, 'pat', (el) => {
      el.textContent = label;
    });
  });
  initPreview();
  refresh();

  document.getElementById('random').addEventListener('click', () => {
    state.look = randomLook();
    refresh();
  });

  const roomInput = document.getElementById('room-code');
  const joinButton = document.getElementById('join');
  const errorEl = document.getElementById('menu-error');

  // Mở link mời (?room=427): điền sẵn mã phòng và làm nổi nút "Vào phòng".
  const invited = (new URLSearchParams(location.search).get('room') ?? '').replace(/\D/g, '').slice(0, 3);
  roomInput.value = invited;
  if (invited.length === 3) {
    joinButton.classList.add('invited');
    document.getElementById('menu-invite').textContent = `Bạn được mời vào phòng ${invited}`;
  }
  roomInput.addEventListener('input', () => {
    roomInput.value = roomInput.value.replace(/\D/g, '').slice(0, 3); // chỉ nhận chữ số
  });

  const submit = (intent) => {
    errorEl.textContent = '';
    saveProfile({ name: nameInput.value.trim(), look: state.look });
    onJoin(nameInput.value.trim(), { ...state.look }, intent);
  };
  const joinRoom = () => {
    if (!/^\d{3}$/.test(roomInput.value)) {
      errorEl.textContent = ERRORS.bad_code;
      roomInput.focus();
      return;
    }
    submit({ room: roomInput.value });
  };

  document.getElementById('create').addEventListener('click', () => submit({ create: true }));
  joinButton.addEventListener('click', joinRoom);
  roomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinRoom();
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') (roomInput.value ? joinRoom : () => submit({ create: true }))();
  });
}
