import { loadTemplate, instantiate } from './weaponModel.js';
import { sword } from './sword.js';
import { dagger } from './dagger.js';
import { axe } from './axe.js';
import { spear } from './spear.js';
import { gauntlet } from './gauntlet.js';
import { thunder } from './thunder.js';

// Hình dạng và cách cầm của từng vũ khí. Id phải khớp bảng WEAPONS ở server/game/weapons.js ('fist' không có hình).
// Mỗi định nghĩa có `icon`, `firstPersonTilt` và MỘT trong hai cách có hình:
//   - `url` (+ length, gripKind, colors, kindOf): nạp model .glb, xem sword.js
//   - `build(side)`: dựng tạm bằng hình khối trong code, trả về node có gốc ở chỗ cầm và đầu vũ khí hướng +Y
// Tuỳ chọn: `dual` (vũ khí hai tay: cầm cả tay trái, `side` = -1), `autoFire` (giữ chuột là tự đánh), `swingSound` (tên âm thanh vung).
// Có .glb thật cho vũ khí nào thì đổi định nghĩa của nó từ `build` sang `url`; nơi khác không phải sửa.
// Thêm vũ khí mới: tạo file định nghĩa rồi đăng ký ở đây.
export const WEAPON_MODELS = { sword, dagger, axe, spear, gauntlet, thunder };

const templates = new Map(); // id → Promise<template>

// Dựng một bản vũ khí. Null nếu vũ khí không có model hoặc nạp lỗi.
export function createWeaponModel(id, side = 1) {
  const def = WEAPON_MODELS[id];
  if (!def) return Promise.resolve(null);
  if (def.build) return Promise.resolve(def.build(side));
  if (!templates.has(id)) templates.set(id, loadTemplate(def));
  return templates.get(id)
    .then(instantiate)
    .catch((err) => {
      console.error(`Không nạp được vũ khí ${id}:`, err);
      return null;
    });
}

// Đưa vũ khí `id` vào tay `hand` (Arm, Fist hoặc tay của nhân vật model). 'fist' / vũ khí không model: chỉ bỏ vật đang cầm.
// `side`: +1 tay phải, -1 tay trái (cho vũ khí có hai bản đối xứng); `tilt`: góc nghiêng ở góc nhìn thứ nhất.
export async function equipWeapon(hand, id, { side = 1, tilt } = {}) {
  hand.wanted = id;
  hand.drop();
  const model = await createWeaponModel(id, side);
  if (!model) return;
  if (hand.wanted === id) hand.hold(model, tilt);
  else model.dispose(); // trong lúc nạp, tay đã đổi sang vũ khí khác hoặc bị huỷ
}

// Cầm vũ khí cho cả hai tay của một người: vũ khí hai tay (dual) cầm ở cả L và R, vũ khí thường chỉ ở R.
// `hands` là { L, R }; `tilt` là góc nghiêng ở góc nhìn thứ nhất.
export function equipLoadout(hands, id, tilt) {
  equipWeapon(hands.R, id, { side: 1, tilt });
  equipWeapon(hands.L, WEAPON_MODELS[id]?.dual ? id : 'fist', { side: -1, tilt });
}

// Bỏ vũ khí và huỷ mọi lần nạp đang chờ cho tay này (gọi trước khi huỷ nhân vật).
export function releaseWeapon(hand) {
  hand.wanted = null;
  hand.drop();
}
