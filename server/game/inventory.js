const { INVENTORY_SLOTS } = require('../config');
const { DEFAULT_WEAPON } = require('./weapons');

// Túi đồ: `p.slots` có INVENTORY_SLOTS ô vũ khí ({ weapon, ammo } hoặc null), cộng một ô tay không cố định ở cuối (FIST_SLOT).
// `p.activeSlot` là ô đang cầm. `p.weapon` / `p.ammo` luôn là bản sao của ô đang cầm để combat / shooting / rockets
// chỉ cần đọc hai trường đó.
const FIST_SLOT = INVENTORY_SLOTS;

const emptySlots = () => Array(INVENTORY_SLOTS).fill(null);

function syncHeld(p) {
  const slot = p.slots[p.activeSlot] ?? null;
  p.weapon = slot ? slot.weapon : DEFAULT_WEAPON;
  p.ammo = slot ? slot.ammo : null;
}

// Chết / sang trận mới: mất hết vũ khí, về tay không.
function clearInventory(p) {
  p.slots = emptySlots();
  p.activeSlot = FIST_SLOT;
  syncHeld(p);
}

// Nhặt vũ khí: đã có cùng loại thì cộng dồn đạn vào ô đó, không thì vào ô trống đầu tiên; xong thì cầm luôn.
// Trả về false khi túi đầy (phải bấm G vứt bớt) để hòm nằm lại trên sân.
function addToInventory(p, weapon, ammo) {
  let index = p.slots.findIndex((s) => s?.weapon === weapon);
  if (index >= 0) {
    const slot = p.slots[index];
    if (slot.ammo !== null && ammo !== null) slot.ammo += ammo;
  } else {
    index = p.slots.indexOf(null);
    if (index < 0) return false;
    p.slots[index] = { weapon, ammo };
  }
  p.activeSlot = index;
  syncHeld(p);
  return true;
}

// Phím 1–4: chọn ô. Ô vũ khí trống thì bỏ qua (giống các game khác), ô tay không lúc nào cũng chọn được.
function selectSlot(p, index) {
  if (p.dead || !Number.isInteger(index) || index < 0 || index > FIST_SLOT) return;
  if (index !== FIST_SLOT && !p.slots[index]) return;
  p.activeSlot = index;
  syncHeld(p);
}

// Lấy vũ khí đang cầm ra khỏi túi (để vứt) và về tay không. Null nếu đang tay không.
function takeActive(p) {
  const slot = p.slots[p.activeSlot] ?? null;
  if (!slot) return null;
  p.slots[p.activeSlot] = null;
  p.activeSlot = FIST_SLOT;
  syncHeld(p);
  return slot;
}

// Dùng một viên đạn (một lần chém với dao). Hết đạn thì vũ khí vẫn nằm trong ô, người chơi tự bấm G để vứt.
function useAmmo(p) {
  const slot = p.slots[p.activeSlot];
  if (!slot || slot.ammo === null) return;
  slot.ammo = Math.max(0, slot.ammo - 1);
  syncHeld(p);
}

// Vũ khí dùng mãi (ammo null) hoặc còn đạn thì đánh / bắn được.
const hasAmmo = (p) => p.ammo === null || p.ammo > 0;

// Gửi trong snapshot: mỗi ô là [vũ khí, đạn] hoặc 0 (trống).
const slotsView = (p) => p.slots.map((s) => (s ? [s.weapon, s.ammo] : 0));

module.exports = { FIST_SLOT, emptySlots, clearInventory, addToInventory, selectSlot, takeActive, useAmmo, hasAmmo, slotsView };
