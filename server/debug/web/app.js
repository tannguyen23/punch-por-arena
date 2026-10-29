import { planSeconds, playersNeeded } from './plan.js';
import { $, el, renderCatalog, renderChips, renderGeneral, renderSettings } from './view.js';

// Trang /admin-test: chọn sự kiện, map, thời gian rồi vào trận. Toàn bộ form dựng từ mô tả mà server gửi (mỗi sự kiện tự khai báo thông số của nó),
// nên thêm sự kiện mới không phải sửa trang. Gửi cấu hình lên /api/debug/apply (server đổi luật và tạo phòng mới), rồi chuyển sang game với
// ?autoplay (tự vào phòng, tự sẵn sàng).

const SAVE_KEY = 'adminTest.options.v2';
const GAME_URL = '/?autoplay=1';

let meta;
let options;
let settingsShown = ''; // các sự kiện đang có nhóm ô thông số, để chỉ dựng lại khi danh sách đổi (dựng lại lúc đang gõ sẽ mất con trỏ)

function defaults() {
  return {
    map: meta.defaultMap,
    events: meta.events.map((e) => e.id),
    first: meta.general.first.default,
    intro: meta.general.intro.default,
    match: 60,
    players: 1,
    matchAuto: true,
    playersAuto: true,
    settings: {},
  };
}

// Thông số của mọi sự kiện: giá trị đã lưu nếu còn hợp lệ, không thì mặc định của sự kiện.
function fillSettings(saved = {}) {
  options.settings = Object.fromEntries(meta.events.map((info) => [
    info.id,
    Object.fromEntries(info.options.map((o) => [o.key, Number.isFinite(saved[info.id]?.[o.key]) ? saved[info.id][o.key] : o.default])),
  ]));
}

function load() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)) ?? {}; } catch { /* chưa có hoặc hỏng: dùng mặc định */ }
  options = { ...defaults(), ...saved };
  options.events = (Array.isArray(options.events) ? options.events : []).filter((id) => meta.events.some((e) => e.id === id));
  if (!meta.maps.some((m) => m.id === options.map)) options.map = meta.defaultMap;
  fillSettings(saved.settings);
}

const save = () => {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(options)); } catch { /* trình duyệt chặn lưu: bỏ qua */ }
};

function setStatus(text, isError = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', isError);
}

// Đồng bộ mọi thứ phụ thuộc vào lựa chọn hiện tại: ô tự tính, chip, nhóm thông số, tóm tắt.
function refresh() {
  const { total, needed } = planSeconds(options, meta.events, meta.gapSeconds, meta.tailSeconds);
  if (options.matchAuto) options.match = needed;
  if (options.playersAuto) options.players = Math.min(meta.maxPlayers, playersNeeded(options, meta.events));
  $('match').value = options.match;
  $('players').value = options.players;
  $('match').disabled = options.matchAuto;
  $('players').disabled = options.playersAuto;
  $('match-auto').checked = options.matchAuto;
  $('players-auto').checked = options.playersAuto;

  renderChips(meta, options.events, (i) => {
    options.events.splice(i, 1);
    refresh();
  });
  const shown = meta.events.filter((e) => options.events.includes(e.id)).map((e) => e.id).join(',');
  if (shown !== settingsShown) {
    settingsShown = shown;
    renderSettings(meta, options, (id, key, value) => {
      options.settings[id][key] = value;
      refresh();
    });
  }

  const fits = options.match >= needed;
  $('summary').textContent = `Sự kiện cuối xong sau khoảng ${Math.round(total)}s · trận nên dài ≥ ${needed}s · cần ≥ ${playersNeeded(options, meta.events)} người (tab)`
    + (fits ? '' : ' · trận đang ngắn hơn: sẽ không đủ chỗ cho mọi sự kiện');
  $('summary').classList.toggle('warn', !fits);
  $('go').disabled = options.events.length === 0;
  save();
}

function build() {
  const set = (events) => {
    options.events = events.slice(0, meta.maxEvents);
    refresh();
  };
  renderCatalog(meta, {
    only: (id) => set([id]),
    add: (id) => set([...options.events, id]),
    all: () => set(meta.events.map((e) => e.id)),
    clear: () => set([]),
  });
  renderGeneral(meta, options, (key, value) => {
    options[key] = value;
    refresh();
  });

  $('map').replaceChildren(...meta.maps.map(({ id, name }) => Object.assign(el('option', '', name), { value: id })));
  $('map').value = options.map;
  $('map').addEventListener('change', () => {
    options.map = $('map').value;
    refresh();
  });
  $('match').min = meta.matchRange.min;
  $('match').max = meta.matchRange.max;
  $('players').max = meta.maxPlayers;
  $('match').addEventListener('input', () => { options.match = Number($('match').value); refresh(); });
  $('players').addEventListener('input', () => { options.players = Number($('players').value); refresh(); });
  $('match-auto').addEventListener('change', () => { options.matchAuto = $('match-auto').checked; refresh(); });
  $('players-auto').addEventListener('change', () => { options.playersAuto = $('players-auto').checked; refresh(); });
}

async function go() {
  $('go').disabled = true;
  setStatus('Đang áp dụng...');
  try {
    const { matchAuto, playersAuto, ...body } = options;
    const res = await fetch('/api/debug/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Lỗi không rõ');
    location.href = GAME_URL;
  } catch (error) {
    setStatus(`Không áp dụng được: ${error.message}`, true);
    $('go').disabled = false;
  }
}

async function main() {
  try {
    meta = await (await fetch('/api/debug/options')).json();
  } catch {
    setStatus('Không đọc được cấu hình từ server. Server có đang chạy bằng npm run dev:debug không?', true);
    return;
  }
  load();
  build();
  refresh();
  $('go').addEventListener('click', go);
  $('more').addEventListener('click', () => window.open(GAME_URL, '_blank'));
}

main();
