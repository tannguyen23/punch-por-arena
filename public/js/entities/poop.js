import { scene } from '../core/scene.js';
import { heightAt } from '../core/terrain.js';
import { part, ball, cylinder, colorMaterial } from '../core/meshes.js';
import { POOP } from '../config.js';

const { TransformNode } = BABYLON;

const LOBES = 5; // mảng bẹt loang ra quanh bãi cho có hình lem nhem, không tròn đều
const SLOPE_LIMIT = 0.5; // mặt đất chênh quá ngần này so với chỗ chó đứng (đứng trên cầu) thì mảng nằm phẳng, không bám theo đất

// Giá trị giả ngẫu nhiên 0–1 theo id và số thứ tự: mọi máy dựng cùng một hình bãi cho cùng một cục shit.
const noise = (id, i) => {
  const v = Math.sin(id * 12.9898 + i * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// Bãi shit con chó thả ra (server/game/poop.js): một vũng bẹt rộng `POOP.patchRadius` (khớp vùng dính `DOG_EVENT.poop.radius` ở server để người
// chơi nhìn là biết chỗ nào dậm phải) với vài mảng loang ra mép và một cục ba tầng có chóp xoắn ở giữa. Material dùng chung theo màu nên huỷ bãi shit
// không được kèm material (disposePoop gọi dispose() không tham số). Gốc ở mặt đất.
export function createPoop({ id, x, y, z }) {
  const root = new TransformNode('poop' + id, scene);
  root.position.set(x, y, z);
  const body = colorMaterial(POOP.colors.body);
  const dark = colorMaterial(POOP.colors.dark);
  const radius = POOP.patchRadius;

  // Vũng chính và các mảng ở mép; mỗi mảng cao hơn mảng trước một chút để không nhấp nháy khi chồng lên nhau, và bám theo mặt đất.
  const flat = (cx, cz, diameter, lift, material) => {
    const ground = heightAt(x + cx, z + cz) - y;
    const mesh = part(ball(1), root, cx, (Math.abs(ground) < SLOPE_LIMIT ? ground : 0) + lift, cz, material);
    mesh.scaling.set(diameter, 0.07, diameter * (0.8 + noise(id, cx * 7 + cz) * 0.3));
    return mesh;
  };
  flat(0, 0, radius * 1.5, 0.03, dark);
  for (let i = 0; i < LOBES; i++) {
    const angle = ((i + noise(id, i)) / LOBES) * Math.PI * 2;
    const reach = radius * (0.5 + noise(id, i + 10) * 0.25);
    flat(Math.cos(angle) * reach, Math.sin(angle) * reach, radius * (0.8 + noise(id, i + 20) * 0.5), 0.045 + i * 0.006, i % 2 ? body : dark);
  }

  // Cục ở giữa to hơn trước cho hợp với cả bãi.
  part(ball(0.8), root, 0, 0.15, 0, body).scaling.y = 0.45;
  part(ball(0.56), root, 0, 0.34, 0, dark).scaling.y = 0.55;
  part(ball(0.34), root, 0, 0.5, 0, body).scaling.y = 0.7;
  part(cylinder(0, 0.18, 0.24), root, 0, 0.7, 0, dark);
  return { id, root, puffIn: Math.random() * POOP.puff.every }; // puffIn: còn bao lâu (giây) nhả một làn khói thối (fx/poopFx.js)
}

export const disposePoop = (poop) => poop.root.dispose();
