import { heightAt } from './terrain.js';

// Các vũng băng đang có trên sân: { id, x, z, r, endsAt (mốc performance.now()) }. Server báo ('freeze' / 'welcome'),
// fx/ice.js vẽ, player/iceSlide.js hỏi `iceAt` để biết người chơi có đang đứng trên băng không.
const patches = new Map();

export const addIcePatch = (patch) => patches.set(patch.id, patch);
export const removeIcePatch = (id) => patches.delete(id);
export const icePatches = () => patches.values();

export function clearIcePatches() {
  patches.clear();
}

// Chân ở (x, z) với độ cao tuyệt đối `feetY` có đang đứng trên băng không. Băng chỉ phủ mặt đất: đứng trên cầu bắc qua vũng băng thì không dính.
export function iceAt(x, z, feetY, heightTolerance) {
  const now = performance.now();
  if (Math.abs(feetY - heightAt(x, z)) > heightTolerance) return false;
  for (const patch of patches.values()) {
    if (patch.endsAt > now && Math.hypot(x - patch.x, z - patch.z) < patch.r) return true;
  }
  return false;
}
