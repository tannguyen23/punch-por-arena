const { INVENTORY_SLOTS, START_WEAPONS } = require('../config');
const { WEAPONS, DEFAULT_WEAPON } = require('./weapons');
const { isTntCarrier, isStunned } = require('./restrictions');
const { prepareMagazine, cancelReload } = require('./magazines');

// Túi đồ: `p.slots` có INVENTORY_SLOTS ô vũ khí ({ weapon, ammo } hoặc null), cộng giá trị FIST_SLOT cho `activeSlot` khi không cầm gì (tay không không phải một ô đồ).
// `p.activeSlot` là ô đang cầm. `p.weapon` / `p.ammo` luôn là bản sao của ô đang cầm để combat / shooting / rockets
// chỉ cần đọc hai trường đó.
const FIST_SLOT = INVENTORY_SLOTS;

const emptySlots = () => Array(INVENTORY_SLOTS).fill(null);

// Túi lúc bắt đầu / hồi sinh: các món trong START_WEAPONS (config.js, để thử) vào những ô đầu, còn lại trống.
function startingSlots() {
  const slots = emptySlots();
  START_WEAPONS.slice(0, INVENTORY_SLOTS).forEach((item, i) => (slots[i] = prepareMagazine({ ...item })));
  return slots;
}

function syncHeld(p) {
  const slot = p.slots[p.activeSlot] ?? null;
  p.weapon = slot ? slot.weapon : DEFAULT_WEAPON;
  p.ammo = slot ? slot.ammo : null;
  p.magazine = slot ? prepareMagazine(slot).magazine ?? null : null;
}

// Chết / sang trận mới: mất hết vũ khí, về tay không (chỉ còn các món khởi đầu).
function clearInventory(p) {
  cancelReload(p);
  p.slots = startingSlots();
  p.activeSlot = FIST_SLOT;
  syncHeld(p);
}

// Mất sạch vũ khí kể cả món khởi đầu (người hoá chó, xem dogEvent.js).
function stripInventory(p) {
  cancelReload(p);
  p.slots = emptySlots();
  p.activeSlot = FIST_SLOT;
  syncHeld(p);
}

// Cất túi vào kho tạm (sự kiện solo, duelEvent.js): chép từng ô để sự kiện có thể đổi p.slots mà không đụng tới bản gốc.
function stashInventory(p) {
  return {
    slots: p.slots.map((slot) => (slot ? { ...slot } : null)),
    activeSlot: p.activeSlot,
  };
}

// Trả túi từ kho tạm: huỷ thay băng đang dở (ô cũ đã bị đổi) rồi cầm lại đúng ô như trước sự kiện.
function restoreInventory(p, stash) {
  cancelReload(p);
  p.slots = stash.slots.map((slot) => (slot ? { ...slot } : null));
  p.activeSlot = stash.activeSlot;
  syncHeld(p);
}

// Nhặt vũ khí: đã có cùng loại thì cộng dồn đạn vào ô đó (lựu đạn tối đa `stack` quả), không thì vào ô trống đầu tiên.
// Chỉ cầm món mới khi đang tay không; đang cầm vũ khí khác thì giữ nguyên món đang cầm (chỉ thêm vào túi).
// Trả về false khi túi đầy / ô lựu đạn đã đủ quả (phải bấm G vứt bớt) để hòm nằm lại trên sân.
function addToInventory(p, weapon, ammo, magazine) {
  if (isTntCarrier(p.room, p)) return false;
  const stack = WEAPONS[weapon]?.stack ?? Infinity;
  let index = p.slots.findIndex((s) => s?.weapon === weapon);
  if (index >= 0) {
    const slot = p.slots[index];
    if (slot.ammo >= stack) return false;
    if (slot.ammo !== null && ammo !== null) slot.ammo = Math.min(stack, slot.ammo + ammo);
  } else {
    index = p.slots.indexOf(null);
    if (index < 0) return false;
    p.slots[index] = prepareMagazine({ weapon, ammo, ...(magazine === undefined ? {} : { magazine }) });
  }
  if (p.activeSlot === FIST_SLOT) {
    cancelReload(p);
    p.activeSlot = index;
    syncHeld(p);
  } else if (p.activeSlot === index) {
    syncHeld(p); // nhặt cùng loại đang cầm: cập nhật số đạn, không đổi tay
  }
  return true;
}

// Phím 1–4: chọn ô. Bấm lại ô đang cầm không làm gì; ô trống (hoặc FIST_SLOT khi bấm X) = về tay không.
function selectSlot(p, index) {
  if (isStunned(p)) return;
  if (isTntCarrier(p.room, p) && index !== FIST_SLOT) return;
  if (p.tableId != null) return;
  if (p.dead || !Number.isInteger(index) || index < 0 || index > FIST_SLOT) return;
  if (!p.slots[index]) index = FIST_SLOT; // ô trống = tay không, giống bấm X
  if (index !== p.activeSlot) cancelReload(p);
  p.activeSlot = index;
  syncHeld(p);
}

// Lấy vũ khí đang cầm ra khỏi túi (để vứt) và về tay không. Null nếu đang tay không.
function takeActive(p) {
  const slot = p.slots[p.activeSlot] ?? null;
  if (!slot) return null;
  cancelReload(p);
  p.slots[p.activeSlot] = null;
  p.activeSlot = FIST_SLOT;
  syncHeld(p);
  return slot;
}

// Dùng một viên đạn (một lần chém với dao, một quả lựu đạn). Hết đạn / gãy thì vũ khí hỏng, ô trống luôn và về tay không.
function useAmmo(p) {
  const slot = p.slots[p.activeSlot];
  if (!slot || slot.ammo === null) return;
  slot.ammo = Math.max(0, slot.ammo - 1);
  if (WEAPONS[slot.weapon].magazineSize) slot.magazine = Math.max(0, slot.magazine - 1);
  if (slot.ammo === 0) {
    p.slots[p.activeSlot] = null;
    p.activeSlot = FIST_SLOT;
  }
  syncHeld(p);
}

// Vũ khí dùng mãi (ammo null) hoặc còn đạn thì đánh / bắn được.
const hasAmmo = (p) => p.ammo === null || p.ammo > 0;

// Gửi trong snapshot: mỗi ô là [vũ khí, tổng đạn, đạn trong băng] hoặc 0 (trống).
const slotsView = (p) => p.slots.map((s) => (s ? [s.weapon, s.ammo, s.magazine ?? null] : 0));

module.exports = {
  FIST_SLOT, emptySlots, startingSlots, clearInventory, stripInventory, stashInventory, restoreInventory,
  addToInventory, selectSlot, takeActive, useAmmo, hasAmmo, slotsView,
};
