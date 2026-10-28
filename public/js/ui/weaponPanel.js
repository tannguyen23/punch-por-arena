import { state } from '../state.js';

const panel = document.getElementById('weapon-panel');

// Các chỉ số hiển thị. `value` lấy số để so sánh, `text` định dạng cho người đọc.
// Thanh dài theo tỉ lệ so với vũ khí mạnh nhất về chỉ số đó nên vũ khí mới tự vừa thanh.
// Thêm chỉ số mới: thêm một dòng ở đây (và trường tương ứng trong WEAPONS ở server nếu chưa có).
const STATS = [
  { label: 'Sát thương', value: (w) => w.damage, text: (v) => `${v}` },
  { label: 'Tầm đánh', value: (w) => w.range, text: (v) => `${v} m` },
  { label: 'Tốc độ', value: (w) => 1000 / w.cooldown, text: (v) => `${v.toFixed(1)} đòn/giây` },
];

const nameEl = document.createElement('div');
nameEl.className = 'weapon-name';
panel.append(nameEl);

const rows = STATS.map((stat) => {
  const row = document.createElement('div');
  row.className = 'stat';
  const label = document.createElement('span');
  label.className = 'stat-label';
  label.textContent = stat.label;
  const bar = document.createElement('div');
  bar.className = 'stat-bar';
  const fill = document.createElement('div');
  bar.append(fill);
  const value = document.createElement('span');
  value.className = 'stat-value';
  row.append(label, bar, value);
  panel.append(row);
  return { stat, fill, value };
});

let shown = null;

// Gọi mỗi lần nhận snapshot; chỉ vẽ lại DOM khi vũ khí đổi.
export function updateWeaponPanel() {
  const weapon = state.weaponTypes[state.weapon];
  if (!weapon || shown === state.weapon) return;
  shown = state.weapon;

  nameEl.textContent = weapon.name;
  const all = Object.values(state.weaponTypes);
  for (const { stat, fill, value } of rows) {
    const max = Math.max(...all.map(stat.value));
    fill.style.width = `${(stat.value(weapon) / max) * 100}%`;
    value.textContent = stat.text(stat.value(weapon));
  }

  // Nháy nhẹ để người chơi để ý khi vừa đổi vũ khí
  panel.classList.remove('changed');
  void panel.offsetWidth;
  panel.classList.add('changed');
}
