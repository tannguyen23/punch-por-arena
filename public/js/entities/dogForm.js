import { solidMaterial } from '../core/scene.js';
import { part, box, ball, cylinder } from '../core/meshes.js';
import { DOG } from '../config.js';

const { Color3, TransformNode } = BABYLON;

// Hình con chó dựng bằng khối, quay mặt về +Z (cùng hướng nhân vật). Material riêng cho từng con vì disposeRemote
// xoá material cùng nhân vật (dispose(false, true)).
function buildDog(root) {
  const node = new TransformNode('dog', root.getScene());
  node.parent = root;
  const fur = solidMaterial(new Color3(...DOG.fur));
  const dark = solidMaterial(new Color3(...DOG.furDark));
  const nose = solidMaterial(new Color3(...DOG.nose));
  const markerMat = solidMaterial(new Color3(...DOG.marker));
  markerMat.emissiveColor = new Color3(...DOG.marker);
  markerMat.disableLighting = true;

  part(box(0.46, 0.4, 0.95), node, 0, 0.6, 0, fur);
  part(box(0.34, 0.32, 0.36), node, 0, 0.86, 0.58, fur);
  part(box(0.2, 0.15, 0.22), node, 0, 0.8, 0.84, dark);
  part(ball(0.09), node, 0, 0.86, 0.96, nose);
  for (const side of [-1, 1]) {
    part(box(0.09, 0.2, 0.06), node, side * 0.13, 1.1, 0.5, dark);
    part(ball(0.05), node, side * 0.09, 0.93, 0.76, nose);
  }
  const tail = new TransformNode('dogTail', node.getScene());
  tail.parent = node;
  tail.position.set(0, 0.76, -0.48);
  tail.rotation.x = -0.9; // chổng lên
  part(box(0.08, 0.08, 0.45), tail, 0, 0, -0.2, dark);
  // Bốn chân: [trước trái, trước phải, sau trái, sau phải], xoay quanh hông.
  const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([side, end]) => {
    const hip = new TransformNode('dogLeg', node.getScene());
    hip.parent = node;
    hip.position.set(side * 0.16, 0.42, end * 0.32);
    part(box(0.12, 0.42, 0.12), hip, 0, -0.21, 0, dark);
    return hip;
  });
  const marker = part(cylinder(0.5, 0, 0.7), node, 0, DOG.markerHeight, 0, markerMat); // mũi tên đỏ chỉ xuống
  return { node, tail, legs, marker };
}

// Hoá chó / trở lại người cho một người chơi khác: ẩn các khối của hình người (isVisible, không dùng setEnabled vì
// tắt một khối là tắt luôn mọi khối con), trừ thanh máu + tên; bật hình chó.
export function setDogForm(r, isDog) {
  if (isDog === (r.dogForm?.active ?? false)) return;
  const bar = r.fill.parent;
  if (isDog) {
    r.dogForm ??= { ...buildDog(r.root), hidden: [], barY: bar.position.y, active: false };
    const dog = r.dogForm;
    dog.hidden = r.root.getChildMeshes(false).filter((m) => m.isVisible && !m.isDescendantOf(bar) && !m.isDescendantOf(dog.node));
    dog.hidden.forEach((m) => (m.isVisible = false));
    dog.node.setEnabled(true);
    bar.position.y = DOG.barHeight;
  } else {
    const dog = r.dogForm;
    dog.hidden.forEach((m) => (m.isVisible = true));
    dog.hidden = [];
    dog.node.setEnabled(false);
    bar.position.y = dog.barY;
  }
  r.dogForm.active = isDog;
}

// Mỗi khung hình: chân chạy chéo theo bước chân (`phase` của remotePlayer), đuôi ngoe nguẩy, mũi tên nhấp nhô.
export function updateDogForm(r, speed, dt) {
  const dog = r.dogForm;
  if (!dog?.active) return;
  const swing = Math.sin(r.phase * 1.6) * 0.9 * Math.min(speed / 3, 1);
  dog.legs.forEach((leg, i) => (leg.rotation.x = i === 0 || i === 3 ? swing : -swing));
  const now = performance.now();
  dog.tail.rotation.y = Math.sin(now / 110) * 0.5;
  dog.marker.position.y = DOG.markerHeight + Math.sin(now / 300) * 0.15;
  dog.marker.rotation.y += dt * 2;
}
