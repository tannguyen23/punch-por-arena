import { loadTemplate, instantiate } from './weaponModel.js';
import { sword } from './sword.js';
import { dagger } from './dagger.js';
import { axe } from './axe.js';
import { spear } from './spear.js';
import { gauntlet } from './gauntlet.js';
import { thunder } from './thunder.js';
import { knife } from './knife.js';
import { pistol } from './pistol.js';
import { ak47 } from './ak47.js';
import { rocket } from './rocket.js';
import { frag } from './frag.js';
import { flashbang } from './flashbang.js';
import { icegrenade } from './icegrenade.js';
import { nuke } from './nuke.js';
import { tnt } from './tnt.js';

// Hình dạng và cách cầm của từng vũ khí. Id phải khớp bảng WEAPONS ở server/game/weapons.js ('fist' không có hình).
// Mỗi định nghĩa có `icon`, `firstPersonTilt` và MỘT trong hai cách có hình:
//   - `url` (+ length, gripKind, colors, kindOf): nạp model .glb, xem sword.js
//   - `build(side)`: dựng tạm bằng hình khối trong code, trả về node có gốc ở chỗ cầm và đầu vũ khí hướng +Y
// Tuỳ chọn: `hand: 'L'` (cầm ở tay trái; mặc định mọi vũ khí cầm ở tay phải), `dual` (vũ khí hai tay: cầm cả tay trái, `side` = -1),`autoFire` (giữ chuột là tự đánh / tự bắn), `swingSound` (tên âm thanh vung).
// Lựu đạn (kind 'throwable'): chỉ cần `build` như vũ khí cận chiến; cùng hình đó được dùng cho quả đang bay.
// Súng / tên lửa (kind do server quyết định): `shotSound` (tên âm thanh bắn, có trong `kinds` của audio/gunSfx.js), `recoil` (camera hếch lên mỗi phát, radian),
// `viewHold` (cách cầm ở góc nhìn thứ nhất, xem pistol.js; có nó thì người khác cũng thấy súng chĩa ra trước).
// `iconSvg` ({ viewBox, path }): hình vẽ cho ô vũ khí thay cho `icon` (emoji hiển thị khác nhau giữa các máy, 🔫 thành súng nước).
// `attack: 'slide'` (vũ khí cận chiến): dùng animation chém `Right Slide` thay vì đấm; mặc định đấm.
// Vũ khí ném (kind 'grenade', icegrenade.js): `attack: 'slide'` làm cú vung tay ném; hình dựng bằng `build` dùng lại cho quả đang bay (fx/grenades.js).
// Có .glb thật cho vũ khí nào thì đổi định nghĩa của nó từ `build` sang `url`; nơi khác không phải sửa.
// Thêm vũ khí mới: tạo file định nghĩa rồi đăng ký ở đây.
export const WEAPON_MODELS = { sword, dagger, axe, spear, gauntlet, thunder, knife, pistol, ak47, rocket, frag, flashbang, icegrenade, nuke, tnt };

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

// Đưa vũ khí `id` vào tay `hand` (Arm hoặc tay của nhân vật model). 'fist' / vũ khí không model: chỉ bỏ vật đang cầm.
// `side`: +1 tay phải, -1 tay trái (cho vũ khí có hai bản đối xứng); `tilt`: góc nghiêng ở góc nhìn thứ nhất.
export async function equipWeapon(hand, id, { side = 1, tilt } = {}) {
  hand.wanted = id;
  hand.attack = WEAPON_MODELS[id]?.attack ?? null; // kiểu đánh của vũ khí (mặc định đấm)
  hand.drop();
  const model = await createWeaponModel(id, side);
  if (!model) return;
  if (hand.wanted === id) hand.hold(model, tilt);
  else model.dispose(); // trong lúc nạp, tay đã đổi sang vũ khí khác hoặc bị huỷ
}

// Cầm vũ khí cho cả hai tay của một người: vũ khí hai tay (dual) cầm ở cả L và R, vũ khí thường chỉ ở một tay
// (R, hoặc L nếu định nghĩa có `hand: 'L'`); tay còn lại là nắm đấm. Tay không đấm luân phiên hai tay; cầm vũ khí thì đánh bằng tay phải.
// `hands` là { L, R }; `tilt` là góc nghiêng ở góc nhìn thứ nhất.
export function equipLoadout(hands, id, tilt) {
  const def = WEAPON_MODELS[id];
  const main = def?.hand === 'L' ? 'L' : 'R';
  const off = main === 'L' ? 'R' : 'L';
  equipWeapon(hands[main], id, { side: main === 'L' ? -1 : 1, tilt });
  equipWeapon(hands[off], def?.dual ? id : 'fist', { side: main === 'L' ? 1 : -1, tilt });
}

// Góc nghiêng khi người khác cầm: súng chĩa thẳng ra trước theo hướng nhìn, vũ khí cận chiến kéo dài theo cẳng tay (undefined).
export const thirdPersonTilt = (id) => (WEAPON_MODELS[id]?.viewHold ? Math.PI / 2 : undefined);

// Bỏ vũ khí và huỷ mọi lần nạp đang chờ cho tay này (gọi trước khi huỷ nhân vật).
export function releaseWeapon(hand) {
  hand.wanted = null;
  hand.attack = null;
  hand.drop();
}
