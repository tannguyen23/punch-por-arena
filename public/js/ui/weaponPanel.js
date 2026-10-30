import { state } from '../state.js';
import { weaponIcon } from './weaponIcon.js';
import { rarityBadge, applyWeaponRarity } from './weaponRarity.js';

const panel = document.getElementById('weapon-panel');

const STATS_VISIBLE_MS = 4000; // vừa đổi vũ khí thì hiện đủ chỉ số ngần này rồi thu gọn còn tên (để khỏi che tay trái)

// Các chỉ số hiển thị. `value` lấy số để so sánh, `text(v, w)` định dạng cho người đọc.
// Thanh dài theo tỉ lệ so với vũ khí mạnh nhất về chỉ số đó trong cùng nhóm (cận chiến so với cận chiến, súng so với súng,
// nếu không tầm bắn 80m của súng làm thanh tầm đánh của mọi vũ khí cận chiến gần như trống) nên vũ khí mới tự vừa thanh.
// Thêm chỉ số mới: thêm một dòng ở đây (và trường tương ứng trong WEAPONS ở server nếu chưa có).
const STATS = [
  { label: 'Sát thương', value: (w) => w.damage, text: (v) => `${v}` },
  { label: 'Tầm đánh', value: (w) => w.range, text: (v) => `${v} m` },
  { label: 'Tốc độ', value: (w) => 1000 / w.cooldown, text: (v, w) => `${v.toFixed(1)} ${isMelee(w) ? 'đòn' : 'phát'}/giây` },
];

const isMelee = (w) => (w.kind ?? 'melee') === 'melee';

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
let collapseTimer = null;

// Gọi mỗi lần nhận snapshot; chỉ vẽ lại DOM khi vũ khí đổi.
export function updateWeaponPanel() {
  const weapon = state.weaponTypes[state.weapon];
  if (!weapon || shown === state.weapon) return;
  shown = state.weapon;

  nameEl.replaceChildren(weaponIcon(state.weapon), document.createTextNode(weapon.name), rarityBadge(state.weapon));
  applyWeaponRarity(panel, state.weapon);
  const peers = Object.values(state.weaponTypes).filter((w) => isMelee(w) === isMelee(weapon));
  for (const { stat, fill, value } of rows) {
    const max = Math.max(...peers.map(stat.value));
    fill.style.width = `${(stat.value(weapon) / max) * 100}%`;
    value.textContent = stat.text(stat.value(weapon), weapon);
  }

  // Nháy nhẹ để người chơi để ý khi vừa đổi vũ khí
  panel.classList.remove('changed', 'compact');
  void panel.offsetWidth;
  panel.classList.add('changed');
  clearTimeout(collapseTimer);
  collapseTimer = setTimeout(() => panel.classList.add('compact'), STATS_VISIBLE_MS);
}
