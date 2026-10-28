const { PUNCH_RANGE, PUNCH_COOLDOWN } = require('../config');

// Vũ khí và chỉ số của nó:
//   damage   - sát thương mỗi đòn
//   range    - tầm đánh (mét)
//   cooldown - thời gian giữa hai đòn (mili giây), càng nhỏ càng nhanh
//   dropWeight - độ hiếm khi rơi ngẫu nhiên; càng lớn càng hay rơi, 0 = không bao giờ rơi (tay không)
// Thêm vũ khí mới: thêm vào bảng này, rồi thêm model trong public/js/entities/weapons/.
// Giao diện (thanh chỉ số) tự đọc các chỉ số này từ 'welcome', không cần sửa client.
const base = { range: PUNCH_RANGE, cooldown: PUNCH_COOLDOWN };
const WEAPONS = {
  fist: { ...base, name: 'Tay không', damage: 10, dropWeight: 0 },
  sword: { ...base, name: 'Kiếm', damage: 25, dropWeight: 1 },
  dagger: { name: 'Dao găm', damage: 10, range: 1.8, cooldown: 200, dropWeight: 1.5 }, // yếu nhưng cực nhanh, tầm ngắn
  axe: { name: 'Rìu', damage: 40, range: 2.6, cooldown: 800, dropWeight: 0.6 }, // mạnh, chậm
  spear: { name: 'Giáo', damage: 22, range: 3.6, cooldown: 600, dropWeight: 0.8 }, // đánh từ xa
  thunder: { name: 'Găng sấm sét', damage: 5, range: 2.0, cooldown: 100, dropWeight: 0.35 }, // đấm liên tục 10 đòn/giây
  gauntlet: { name: 'Găng tay vô cực', damage: 45, range: 2.0, cooldown: 900, dropWeight: 0.2 }, // mạnh nhất, hiếm
};

const DEFAULT_WEAPON = 'fist';

// Chọn ngẫu nhiên một vũ khí theo dropWeight. Null nếu không có vũ khí nào rơi được.
function randomDropWeapon() {
  const droppable = Object.entries(WEAPONS).filter(([, w]) => w.dropWeight > 0);
  if (droppable.length === 0) return null;
  let roll = Math.random() * droppable.reduce((sum, [, w]) => sum + w.dropWeight, 0);
  for (const [id, w] of droppable) {
    roll -= w.dropWeight;
    if (roll < 0) return id;
  }
  return droppable.at(-1)[0];
}

// Phần client cần biết để hiển thị (tên và các chỉ số, không có độ hiếm); gửi trong 'welcome'.
const weaponInfo = () =>
  Object.fromEntries(
    Object.entries(WEAPONS).map(([id, { name, damage, range, cooldown }]) => [id, { name, damage, range, cooldown }]),
  );

module.exports = { WEAPONS, DEFAULT_WEAPON, randomDropWeapon, weaponInfo };
