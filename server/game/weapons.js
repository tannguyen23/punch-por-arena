const { PUNCH_RANGE, PUNCH_COOLDOWN } = require('../config');

// Vũ khí và chỉ số của nó:
//   kind     - 'melee' (đánh gần, tin nhắn 'punch'), 'gun' (đạn bay tức thì, 'fire') hoặc 'rocket' (tên lửa bay, nổ lan, 'fire')
//   damage   - sát thương mỗi đòn / mỗi viên (tên lửa: sát thương ở tâm vụ nổ)
//   range    - tầm đánh / tầm bắn (mét)
//   cooldown - thời gian giữa hai đòn / hai phát (mili giây), càng nhỏ càng nhanh
//   ammo     - [ít nhất, nhiều nhất] số đạn (dao: số lần chém) khi nhặt từ hòm; không có = dùng mãi
//   spread   - độ lệch ngẫu nhiên của đường đạn (radian), chỉ súng
//   splash, speed - bán kính nổ (mét) và tốc độ bay (m/giây), chỉ tên lửa
//   dropWeight - độ hiếm khi rơi trong hòm tiếp tế; càng lớn càng hay rơi, 0 = không bao giờ rơi
// Thêm vũ khí mới: thêm vào bảng này, rồi thêm model trong public/js/entities/weapons/.
// Giao diện (thanh chỉ số) tự đọc các chỉ số này từ 'welcome', không cần sửa client.
const base = { kind: 'melee', range: PUNCH_RANGE, cooldown: PUNCH_COOLDOWN, dropWeight: 0 };
const WEAPONS = {
  fist: { ...base, name: 'Tay không', damage: 10 },
  // Vũ khí cận chiến cũ: vẫn dùng được nhưng không còn rơi (hòm tiếp tế chỉ có 4 món bên dưới).
  sword: { ...base, name: 'Kiếm', damage: 25 },
  dagger: { ...base, name: 'Dao găm', damage: 10, range: 1.8, cooldown: 200 },
  axe: { ...base, name: 'Rìu', damage: 40, range: 2.6, cooldown: 800 },
  spear: { ...base, name: 'Giáo', damage: 22, range: 3.6, cooldown: 600 },
  thunder: { ...base, name: 'Găng sấm sét', damage: 5, range: 2.0, cooldown: 100 },
  gauntlet: { ...base, name: 'Găng tay vô cực', damage: 45, range: 2.0, cooldown: 900 },

  // Hòm tiếp tế: mỗi món 25%.
  knife: { ...base, name: 'Dao chiến đấu', damage: 25, range: 2.0, cooldown: 300, ammo: [10, 20], dropWeight: 1 },
  pistol: { kind: 'gun', name: 'Súng lục', damage: 25, range: 60, cooldown: 300, spread: 0.012, ammo: [10, 20], dropWeight: 1 },
  ak47: { kind: 'gun', name: 'AK-47', damage: 16, range: 80, cooldown: 110, spread: 0.03, ammo: [10, 20], dropWeight: 1 },
  rocket: {
    kind: 'rocket', name: 'Súng phóng tên lửa', damage: 90, range: 80, cooldown: 1200, splash: 4, speed: 35, ammo: [2, 4], dropWeight: 1,
  },
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

// Số đạn ngẫu nhiên trong khoảng `ammo` của vũ khí; null = vũ khí dùng mãi không hết.
function rollAmmo(id) {
  const range = WEAPONS[id]?.ammo;
  if (!range) return null;
  const [min, max] = range;
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Phần client cần biết để hiển thị và tính thời gian hồi (không có độ hiếm, độ lệch); gửi trong 'welcome'.
const weaponInfo = () =>
  Object.fromEntries(
    Object.entries(WEAPONS).map(([id, { kind, name, damage, range, cooldown, splash }]) => [
      id,
      { kind, name, damage, range, cooldown, splash },
    ]),
  );

module.exports = { WEAPONS, DEFAULT_WEAPON, randomDropWeapon, rollAmmo, weaponInfo };
