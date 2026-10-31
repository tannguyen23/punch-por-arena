// Menu và tuỳ chỉnh cạnh nhau; mỗi lần tải trang random ngoại hình, giữ tên và ảnh mặt.
import { loadProfile, saveProfile } from './profileStorage.js';
import { initCustomize, openCustomize } from './customize.js';
import { stopPreview } from './preview.js';
import { initRoomList, setRoomListActive } from './roomList.js';
import { DEFAULT_LOOK, KICKED_NOTICE_KEY, ROOM_CLOSED_NOTICE_KEY, ROOM_MAX_PLAYERS } from '../config.js';
import { state } from '../state.js';
import { initGuide } from './guide.js';
import { randomLook } from './lookOptions.js';

const ERRORS = {
  room_not_found: 'Không tìm thấy phòng này',
  room_full: 'Phòng đã đầy',
  bad_code: 'Mã phòng gồm 3 chữ số',
  bad_maps: 'Hãy chọn ít nhất một map hợp lệ',
  server_full: 'Máy chủ đã hết phòng, thử lại sau',
  kicked: 'Bạn đã bị chủ phòng mời ra khỏi phòng',
  spectator_join_only: 'Chế độ khán giả chỉ vào phòng có sẵn (không tạo phòng được)',
  room_closed: 'Phòng đã đóng vì không còn người chơi',
};
const NAME_REQUIRED = 'Hãy nhập tên trước khi chơi';

const errorEl = document.getElementById('menu-error');

// Server từ chối cho vào phòng: hiện lý do ngay trên menu để người chơi thử lại.
export function showMenuError(reason) {
  errorEl.textContent = ERRORS[reason] ?? 'Không vào được phòng';
}

// Đã vào phòng: ẩn menu, ngừng hỏi server danh sách phòng và tắt khung xem trước.
export function hideMenu() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('create-room').hidden = true;
  setRoomListActive(false);
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

  // Tên là bắt buộc: thiếu thì nhắc và đưa con trỏ về ô tên.
  const requireName = () => {
    const name = nameInput.value.trim();
    nameError.textContent = name ? '' : NAME_REQUIRED;
    if (!name) nameInput.focus();
    return name;
  };

  // Màn tạo phòng: chọn map xoay vòng và bot (số lượng + mức), thay cho tham số URL cũ.
  const createButton = document.getElementById('create');
  const createScreen = document.getElementById('create-room');
  const createConfirm = document.getElementById('create-confirm');
  const createCancel = document.getElementById('create-cancel');
  const createError = document.getElementById('create-error');
  const mapOptionsEl = document.getElementById('map-options');
  const selectedMaps = new Set();
  const botToggle = document.getElementById('bot-enabled');
  const botMinus = document.getElementById('bot-minus');
  const botPlus = document.getElementById('bot-plus');
  const botCountEl = document.getElementById('bot-count');
  const botHint = document.getElementById('bot-hint');
  const levelButtons = [...document.querySelectorAll('#create-room .bot-level')];
  const MAX_BOTS = ROOM_MAX_PLAYERS - 1;
  let botCount = 0; // 0 = không thêm bot
  let botLevel = 2;
  const weaponRates = document.getElementById('weapon-rates');
  const weaponRatesState = document.getElementById('weapon-rates-state');
  const weaponOptionsEl = document.getElementById('weapon-options');
  const weaponReset = document.getElementById('weapon-reset');
  const weaponInputs = new Map(); // id vũ khí → input range (trọng số)
  const weaponPcts = new Map(); // id vũ khí → output % thực tế
  const weaponDefaults = new Map(); // id vũ khí → trọng số mặc định từ server
  const eventPicksState = document.getElementById('event-picks-state');
  const eventOptionsEl = document.getElementById('event-options');
  const eventReset = document.getElementById('event-reset');
  const eventInputs = new Map(); // id sự kiện → checkbox

  // Khán giả (?mode=spectator) chỉ vào phòng có sẵn để xem.
  const spectator = state.spectator;
  if (spectator) createButton.style.display = 'none';

  const syncBots = () => {
    const on = botToggle.checked;
    botCountEl.textContent = String(botCount);
    botMinus.disabled = !on || botCount <= 1;
    botPlus.disabled = !on || botCount >= MAX_BOTS;
    for (const button of levelButtons) {
      const level = Number(button.dataset.level);
      button.disabled = !on;
      button.classList.toggle('active', level === botLevel);
      button.setAttribute('aria-pressed', String(level === botLevel));
    }
    botHint.textContent = on ? `Bot lấp vào chỗ trống, tối đa ${MAX_BOTS}.` : 'Chưa thêm bot.';
  };
  botToggle.addEventListener('change', () => {
    botCount = botToggle.checked ? Math.max(3, botCount) : 0; // bật thì mặc định 3 bot
    syncBots();
  });
  botMinus.addEventListener('click', () => { botCount = Math.max(1, botCount - 1); syncBots(); });
  botPlus.addEventListener('click', () => { botCount = Math.min(MAX_BOTS, botCount + 1); syncBots(); });
  for (const button of levelButtons) {
    button.addEventListener('click', () => { botLevel = Number(button.dataset.level); syncBots(); });
  }
  syncBots();

  // Tỷ lệ rơi vũ khí riêng của phòng: trọng số tương đối, hiện % thực tế; 0 = không rơi.
  const syncWeaponRates = () => {
    let total = 0;
    for (const input of weaponInputs.values()) total += Number(input.value);
    let dirty = false;
    for (const [id, input] of weaponInputs) {
      const weight = Number(input.value);
      weaponPcts.get(id).textContent = `${total > 0 ? Math.round((weight / total) * 100) : 0}%`;
      if (weight !== weaponDefaults.get(id)) dirty = true;
    }
    weaponRatesState.textContent = dirty ? 'tùy chỉnh' : 'mặc định';
    weaponRatesState.classList.toggle('custom', dirty);
  };
  const renderWeaponRates = (weapons) => {
    weaponOptionsEl.replaceChildren();
    weaponInputs.clear();
    weaponPcts.clear();
    weaponDefaults.clear();
    for (const weapon of weapons) {
      const row = document.createElement('div');
      row.className = 'weapon-rate';
      const name = document.createElement('span');
      name.className = 'weapon-rate-name';
      name.textContent = weapon.name;
      if (weapon.rarity) {
        const tag = document.createElement('em');
        tag.textContent = weapon.rarity.name;
        tag.style.color = weapon.rarity.color;
        name.append(' ', tag);
      }
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '100';
      input.step = '1';
      input.value = String(weapon.weight);
      input.setAttribute('aria-label', `Tỷ lệ ${weapon.name}`);
      input.dataset.weapon = weapon.id;
      if (weapon.rarity?.color) input.style.accentColor = weapon.rarity.color;
      const pct = document.createElement('output');
      row.append(name, input, pct);
      weaponOptionsEl.append(row);
      weaponInputs.set(weapon.id, input);
      weaponPcts.set(weapon.id, pct);
      weaponDefaults.set(weapon.id, weapon.weight);
      input.addEventListener('input', () => {
        createError.textContent = '';
        syncWeaponRates();
      });
    }
    syncWeaponRates();
  };
  weaponReset.addEventListener('click', () => {
    for (const [id, input] of weaponInputs) input.value = String(weaponDefaults.get(id));
    createError.textContent = '';
    syncWeaponRates();
  });
  fetch('/api/weapons')
    .then((response) => {
      if (!response.ok) throw new Error(`Không tải được danh sách vũ khí (${response.status})`);
      return response.json();
    })
    .then((weapons) => {
      if (!Array.isArray(weapons) || weapons.length === 0) throw new Error('Máy chủ chưa có vũ khí rơi được');
      renderWeaponRates(weapons);
    })
    .catch(() => {
      weaponOptionsEl.textContent = 'Không tải được danh sách vũ khí. Phòng sẽ dùng tỷ lệ mặc định.';
    });

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
          createError.textContent = '';
        });
        const name = document.createElement('span');
        name.textContent = map.name;
        label.append(checkbox, name);
        mapOptionsEl.append(label);
      }
      createConfirm.disabled = false;
    })
    .catch((error) => {
      mapOptionsEl.textContent = 'Không tải được danh sách map. Hãy tải lại trang.';
      createError.textContent = error.message;
      createConfirm.disabled = true;
    });

  // Sự kiện được phép xuất hiện trong trận: bỏ chọn hết = trận không có sự kiện.
  const syncEventPicks = () => {
    if (eventInputs.size === 0) return;
    const checked = [...eventInputs.values()].filter((input) => input.checked).length;
    eventPicksState.textContent = checked === eventInputs.size ? 'tất cả' : checked === 0 ? 'không có' : 'tùy chỉnh';
    eventPicksState.classList.toggle('custom', checked !== eventInputs.size);
  };
  const renderEventPicks = (events) => {
    eventOptionsEl.replaceChildren();
    eventInputs.clear();
    for (const event of events) {
      const label = document.createElement('label');
      label.className = 'event-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.value = event.id;
      const name = document.createElement('span');
      name.className = 'event-option-name';
      name.textContent = event.name;
      const players = document.createElement('em');
      players.textContent = `${event.minPlayers}+ người`;
      label.append(checkbox, name, players);
      eventOptionsEl.append(label);
      eventInputs.set(event.id, checkbox);
      checkbox.addEventListener('change', () => {
        createError.textContent = '';
        syncEventPicks();
      });
    }
    syncEventPicks();
  };
  eventReset.addEventListener('click', () => {
    for (const input of eventInputs.values()) input.checked = true;
    createError.textContent = '';
    syncEventPicks();
  });
  fetch('/api/events')
    .then((response) => {
      if (!response.ok) throw new Error(`Không tải được danh sách sự kiện (${response.status})`);
      return response.json();
    })
    .then((events) => {
      if (!Array.isArray(events) || events.length === 0) throw new Error('Máy chủ chưa có sự kiện nào');
      renderEventPicks(events);
    })
    .catch(() => {
      eventOptionsEl.textContent = 'Không tải được danh sách sự kiện. Phòng sẽ dùng tất cả.';
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

  // Mở / đóng màn tạo phòng. Ô tên nằm ở menu phía sau nên phải kiểm tra trước khi tạo.
  const openCreate = () => {
    if (spectator) return;
    if (!createConfirm.disabled) createError.textContent = '';
    createScreen.hidden = false;
    syncBots();
    (createConfirm.disabled ? botToggle : createConfirm).focus();
  };
  const closeCreate = () => {
    createScreen.hidden = true;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    createButton.focus();
  };
  const confirmCreate = () => {
    if (selectedMaps.size === 0) {
      createError.textContent = ERRORS.bad_maps;
      return;
    }
    if (!nameInput.value.trim()) { // chưa có tên: đóng màn để menu hiện lỗi + focus ô tên
      closeCreate();
      requireName();
      return;
    }
    const weights = weaponInputs.size > 0
      ? Object.fromEntries([...weaponInputs].map(([id, input]) => [id, Number(input.value)]))
      : null;
    if (weights && !Object.values(weights).some((value) => value > 0)) {
      weaponRates.open = true;
      createError.textContent = 'Ít nhất một vũ khí phải có tỷ lệ > 0';
      return;
    }
    const eventKinds = eventInputs.size > 0
      ? [...eventInputs].filter(([, input]) => input.checked).map(([id]) => id)
      : null;
    closeCreate();
    submit({
      create: true,
      mapIds: [...selectedMaps],
      botCount,
      botLevel,
      ...(weights ? { weaponWeights: weights } : {}),
      ...(eventKinds ? { eventKinds } : {}),
    });
  };

  initRoomList((code) => submit({ room: code }), spectator); // bấm "Vào" ở một phòng trong danh sách (khán giả vào được cả phòng đầy)
  setRoomListActive(true); // danh sách phòng hiện ngay trên menu, làm mới định kỳ tới khi vào phòng

  // Mở link mời: nút riêng vào thẳng phòng được mời (mã vẫn điền sẵn ở ô mã phòng nếu vào không được).
  const invited = invitedCode();
  roomInput.value = invited;
  if (invited.length === 3) {
    startButton.hidden = false;
    startButton.textContent = `Vào phòng ${invited}`;
    startButton.classList.add('invited');
    document.getElementById('join').classList.add('invited');
    document.getElementById('menu-invite').textContent = `Bạn được mời vào phòng ${invited}`;
  } else if (spectator) {
    document.getElementById('menu-invite').textContent = 'Chế độ khán giả: chọn một phòng đang mở hoặc nhập mã phòng để xem';
  }
  const start = () => {
    if (!requireName()) return;
    if (invited.length === 3) submit({ room: invited });
  };

  startButton.addEventListener('click', start);
  nameInput.addEventListener('input', () => {
    if (nameInput.value.trim()) nameError.textContent = '';
    save();
  });
  nameInput.addEventListener('keydown', (e) => e.key === 'Enter' && start());
  createButton.addEventListener('click', openCreate);
  createCancel.addEventListener('click', closeCreate);
  createConfirm.addEventListener('click', confirmCreate);
  createScreen.addEventListener('click', (e) => {
    if (e.target === createScreen) closeCreate(); // bấm ra ngoài thẻ
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !createScreen.hidden) {
      e.preventDefault();
      closeCreate();
    }
  });
  document.getElementById('join').addEventListener('click', joinRoom);
  roomInput.addEventListener('input', () => {
    roomInput.value = roomInput.value.replace(/\D/g, '').slice(0, 3); // chỉ nhận chữ số
  });
  roomInput.addEventListener('keydown', (e) => e.key === 'Enter' && joinRoom());

  // Vừa bị chủ phòng kick (net/roomHandlers.js tải lại trang về menu): báo lý do trên menu, một lần.
  try {
    if (sessionStorage.getItem(KICKED_NOTICE_KEY)) {
      sessionStorage.removeItem(KICKED_NOTICE_KEY);
      showMenuError('kicked');
    }
    if (sessionStorage.getItem(ROOM_CLOSED_NOTICE_KEY)) {
      sessionStorage.removeItem(ROOM_CLOSED_NOTICE_KEY);
      showMenuError('room_closed');
    }
  } catch { /* trình duyệt chặn sessionStorage: không báo */ }

  // Chế độ test (?autoplay): vào thẳng phòng mới, không cần nhập tên hay bấm nút. Server test (scripts/test-events.js)
  // cho mọi tab vào chung một phòng, tự xếp map và tự sẵn sàng.
  if (new URLSearchParams(location.search).has('autoplay')) {
    const base = (saved?.name?.trim() || 'Tester').slice(0, 12);
    const name = `${base} ${10 + Math.floor(Math.random() * 90)}`;
    // Khán giả không tạo phòng: chỉ tự vào phòng có sẵn trong link (?room=...).
    if (!spectator) onJoin(name, { ...look }, { create: true });
    else if (invited.length === 3) onJoin(name, { ...look }, { room: invited });
  }
}
