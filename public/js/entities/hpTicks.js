import { scene } from '../core/scene.js';
import { hpTickStep } from '../core/hpTicks.js';
import { HP_TICKS } from '../config.js';

const { StandardMaterial, DynamicTexture } = BABYLON;

// Thanh máu 3D: lớp phủ vạch chia trong suốt, cùng cỡ với nền thanh (rộng 1,1 trong đó phần máu rộng 1, hai lề 0,05). Mỗi mức máu tối đa chỉ có
// vài giá trị (100 / 400 / 50...) nên texture + material dựng một lần theo máu tối đa rồi DÙNG CHUNG cho mọi người: nơi giải phóng nhân vật
// (disposeRemote) phải gỡ material này ra trước khi dispose(false, true), nếu không nó bị huỷ theo.
const BAR_WIDTH = 1.1;
const FILL_MARGIN = 0.05;
const WIDTH_PX = 512;
const HEIGHT_PX = 32;
const materials = new Map(); // `small:big:maxHp` → material

export function tickMaterial(maxHp) {
  const { small, big } = hpTickStep(maxHp);
  const key = `${small}:${big}:${maxHp}`;
  if (materials.has(key)) return materials.get(key);
  const tex = new DynamicTexture('hpTicksTex', { width: WIDTH_PX, height: HEIGHT_PX }, scene, false);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.fillStyle = HP_TICKS.color;
  for (let hp = small; hp < maxHp; hp += small) {
    const isBig = hp % big === 0;
    const w = isBig ? HP_TICKS.bigPx : HP_TICKS.smallPx;
    const h = isBig ? HEIGHT_PX : HEIGHT_PX * HP_TICKS.smallHeight;
    const x = ((FILL_MARGIN + (hp / maxHp)) / BAR_WIDTH) * WIDTH_PX;
    ctx.fillRect(x - w / 2, (HEIGHT_PX - h) / 2, w, h);
  }
  tex.update();
  const mat = new StandardMaterial('hpTicksMat', scene);
  mat.emissiveTexture = tex;
  mat.opacityTexture = tex;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  materials.set(key, mat);
  return mat;
}
