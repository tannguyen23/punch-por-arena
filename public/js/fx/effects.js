// Hiệu ứng khi đấm trúng: tia lửa, ngôi sao va chạm, số sát thương bay lên.
import { scene } from '../core/scene.js';

const { MeshBuilder, StandardMaterial, Color3 } = BABYLON;

const items = []; // { mesh, life, max, step(dt, k), ownMaterial }
const materials = new Map(); // material dùng chung theo khoá (số sát thương...)

// Thêm một hiệu ứng tự huỷ sau `life` giây; `step(dt, k)` chạy mỗi khung hình với k đi từ 0 → 1 (dùng ở các file fx khác).
export const track = (item) => items.push(item);

function textMaterial(name, tex) {
  const mat = new StandardMaterial(name, scene);
  mat.emissiveTexture = tex;
  mat.opacityTexture = tex;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  return mat;
}

function createSparkMaterial() {
  const mat = new StandardMaterial('sparkMat', scene);
  mat.emissiveColor = new Color3(1, 0.8, 0.25);
  mat.disableLighting = true;
  return mat;
}

// Ngôi sao 8 cánh vẽ bằng canvas
function createStarMaterial() {
  const tex = new BABYLON.DynamicTexture('starTex', 128, scene, true);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? 60 : 26;
    const a = (i / 16) * Math.PI * 2;
    const x = 64 + Math.cos(a) * r;
    const y = 64 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffe066';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ff7a00';
  ctx.stroke();
  tex.update();
  return textMaterial('starMat', tex);
}

// Vòng sóng va chạm: một vòng trắng mảnh vẽ bằng canvas, dùng cho mọi cú trúng (khác nhau chỉ ở cỡ).
function createRingMaterial() {
  const tex = new BABYLON.DynamicTexture('ringTex', 128, scene, true);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#fff6d6';
  ctx.stroke();
  tex.update();
  return textMaterial('ringMat', tex);
}

function createDustMaterial() {
  const mat = new StandardMaterial('dustMat', scene);
  mat.emissiveColor = new Color3(0.78, 0.74, 0.68);
  mat.disableLighting = true;
  return mat;
}

const sparkMat = createSparkMaterial();
const starMat = createStarMaterial();
const ringMat = createRingMaterial();
const dustMat = createDustMaterial();

// Hiệu ứng nở ra hàng chục lần mỗi giây (tia lửa, ngôi sao, số sát thương): hình và material dùng chung, mỗi hiệu ứng chỉ là một instance
// (không tạo geometry / material / texture mới mỗi lần: tốn CPU, sinh rác và làm shader biên dịch lại).
const sources = new Map(); // material (hoặc khoá) → mesh nguồn ẩn, các instance của nó được Babylon vẽ gộp

function sourceFor(key, create) {
  if (!sources.has(key)) {
    const source = create();
    source.isVisible = false; // chỉ các instance được vẽ
    source.isPickable = false;
    sources.set(key, source);
  }
  return sources.get(key);
}

// Một bản (instance) của mesh nguồn ẩn tên `key`; `create()` dựng mesh nguồn đúng một lần (kèm material dùng chung) rồi dùng lại mãi.
// Mọi hiệu ứng xuất hiện theo sự kiện lặp (mỗi phát bắn, mỗi tia sét...) phải lấy hình qua đây, không `MeshBuilder.Create*` mỗi lần (quy tắc 16 trong CLAUDE.md).
// Lưu ý: Babylon vẽ instance theo cấu hình của mesh NGUỒN (nhóm vẽ `renderingGroupId`, material), không phải của instance. Cần khác nhóm vẽ thì dùng khoá khác.
export const instanceOf = (key, create) => sourceFor(key, create).createInstance(key);

// Tấm phẳng luôn quay về camera, rộng `width` × cao `height` mét. Mesh nguồn là tấm 1×1 gắn đúng material nên cả nhóm cùng material vẽ gộp một lần.
function billboard(width, height, x, y, z, material) {
  const source = sourceFor(material, () => {
    const plane = MeshBuilder.CreatePlane('fx', { size: 1 }, scene);
    plane.material = material;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    return plane;
  });
  const mesh = source.createInstance('fx');
  mesh.position.set(x, y, z);
  mesh.scaling.set(width, height, 1);
  mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  return mesh;
}

const sparkSource = () => sourceFor('spark', () => {
  const sphere = MeshBuilder.CreateSphere('sparkSource', { diameter: 1, segments: 4 }, scene);
  sphere.material = sparkMat;
  return sphere;
});

export function burst(x, y, z, count = 12, speedScale = 1) {
  for (let i = 0; i < count; i++) {
    const mesh = sparkSource().createInstance('spark');
    const diameter = 0.1 + Math.random() * 0.08;
    mesh.position.set(x, y, z);
    const angle = Math.random() * Math.PI * 2;
    const speed = (2.5 + Math.random() * 3.5) * speedScale;
    const v = { x: Math.cos(angle) * speed, y: 1 + Math.random() * 3, z: Math.sin(angle) * speed };
    const max = 0.35 + Math.random() * 0.25;
    items.push({
      mesh,
      life: max,
      max,
      step(dt, k) {
        v.y -= 9 * dt;
        mesh.position.x += v.x * dt;
        mesh.position.y += v.y * dt;
        mesh.position.z += v.z * dt;
        mesh.scaling.setAll(Math.max(1 - k, 0.001) * diameter);
      },
    });
  }
}

export function flash(x, y, z, size = 1) {
  const mesh = billboard(size, size, x, y, z, starMat);
  items.push({
    mesh,
    life: 0.22,
    max: 0.22,
    step(dt, k) {
      const s = k < 0.4 ? 0.25 + (k / 0.4) * 0.65 : 0.9 * (1 - (k - 0.4) / 0.6);
      mesh.scaling.setAll(Math.max(s, 0.001) * size);
    },
  });
}

// Vòng sóng va chạm: nở nhanh tới `size` mét rồi thu lại (không làm mờ, xem damageText).
export function ring(x, y, z, size, life) {
  const mesh = billboard(size, size, x, y, z, ringMat);
  items.push({
    mesh,
    life,
    max: life,
    step(dt, k) {
      const s = k < 0.55 ? 0.25 + 0.75 * Math.sin((k / 0.55) * Math.PI / 2) : Math.max(1 - (k - 0.55) / 0.45, 0.001);
      mesh.scaling.setAll(s * size);
    },
  });
}

const dustSource = () => sourceFor('dust', () => {
  const puff = MeshBuilder.CreateSphere('dustSource', { diameter: 1, segments: 5 }, scene);
  puff.material = dustMat;
  return puff;
});

// Vài cục bụi bốc lên chậm, phình ra rồi xẹp dần: cho cú đánh có "thịt".
export function dust(x, y, z, count, spread = 1) {
  for (let i = 0; i < count; i++) {
    const mesh = dustSource().createInstance('dust');
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.6 + Math.random() * 0.9) * spread;
    const vx = Math.cos(angle) * speed;
    const vz = Math.sin(angle) * speed;
    const size = (0.14 + Math.random() * 0.12) * spread;
    const max = 0.45 + Math.random() * 0.25;
    mesh.position.set(x, y, z);
    items.push({
      mesh,
      life: max,
      max,
      step(dt, k) {
        mesh.position.x += vx * dt * (1 - k);
        mesh.position.z += vz * dt * (1 - k);
        mesh.position.y += 0.7 * dt;
        mesh.scaling.setAll(size * (k < 0.3 ? 0.5 + k / 0.3 * 0.5 : Math.max(1 - (k - 0.3) / 0.7, 0.001)));
      },
    });
  }
}

// Mỗi con số sát thương (chuỗi khác nhau) vẽ texture và dựng material đúng một lần rồi dùng lại: số khác nhau chỉ vài chục nên bộ nhớ không đáng kể.
function damageMaterial(text, color) {
  const key = `dmg:${color}:${text}`;
  if (materials.has(key)) return materials.get(key);
  const tex = new BABYLON.DynamicTexture('dmgTex', { width: 256, height: 96 }, scene, true);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#fff';
  ctx.strokeText(text, 128, 48);
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 48);
  tex.update();
  const mat = textMaterial('dmgMat', tex);
  materials.set(key, mat);
  return mat;
}

// Số sát thương bay lên rồi thu nhỏ biến mất (không làm mờ: đổi độ trong suốt từng khung hình đòi material riêng cho từng số).
// `color` / `scale`: mức sát thương càng cao càng to, đổi màu (HIT_FX.tiers); số khác màu là material khác nhưng vẫn chỉ vài chục loại.
export function damageText(x, y, z, text, color = '#e53935', scale = 1) {
  const mesh = billboard(0.9 * scale, 0.34 * scale, x, y, z, damageMaterial(text, color));
  items.push({
    mesh,
    life: 0.8,
    max: 0.8,
    step(dt, k) {
      mesh.position.y += 1.4 * dt;
      const s = k < 0.5 ? 1 + 0.3 * (1 - Math.min(k * 6, 1)) : Math.max(1 - (k - 0.5) / 0.5, 0.001);
      mesh.scaling.set(0.9 * s * scale, 0.34 * s * scale, 1);
    },
  });
}

export function update(dt) {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.life -= dt;
    if (it.life <= 0) {
      it.mesh.dispose(false, !!it.ownMaterial);
      items.splice(i, 1);
    } else {
      it.step(dt, 1 - it.life / it.max);
    }
  }
}
