import { state, pickups } from '../state.js';
import { PICKUP_RADIUS } from '../config.js';
import { announce } from '../ui/matchHud.js';

let blockedId = null; // vũ khí đang đứng trên mà không nhặt được; chỉ nhắc một lần mỗi lần bước vào

const isFull = () => state.inventory.length > 0 && state.inventory.every(Boolean);
const owns = (weapon) => state.inventory.some((s) => s?.weapon === weapon); // cùng loại thì vẫn nhặt được (cộng đạn)

function blockedPickup() {
  if (!state.alive || !isFull()) return null;
  const { x, z } = state.me;
  for (const pickup of pickups.values()) {
    const { position } = pickup.root;
    if (pickup.landed && !owns(pickup.weapon) && Math.hypot(position.x - x, position.z - z) < PICKUP_RADIUS) return pickup;
  }
  return null;
}

// Túi đầy thì server để vũ khí nằm lại mà không báo gì; tự nhắc người chơi vứt bớt.
export function updatePickupHint() {
  const pickup = blockedPickup();
  if (pickup && pickup.id !== blockedId) announce('TÚI ĐẦY! BẤM G ĐỂ VỨT BỚT');
  blockedId = pickup?.id ?? null;
}
