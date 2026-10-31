import { scene } from '../core/scene.js';
import { state } from '../state.js';
import { duelOf, isFighter } from '../core/duel.js';
import { isStunned } from '../core/freeze.js';
import { groundAt, heightAt, isSupported } from '../core/terrain.js';
import { predictThrow } from '../core/throwPath.js';
import { skillPreview } from './skillPreview.js';
import { makePreview } from './previewStyle.js';
import { leapPreview } from './leapPreview.js';
import { grenadePreview } from './grenadePreview.js';
import { aimAxes } from '../player/aim.js';
import { DUEL_THROW_PREVIEW } from '../config.js';

const { MeshBuilder, Vector3, Color3, StandardMaterial } = BABYLON;
let line = null;
let marker = null;
let material = null;

export function clearThrowPreview() {
  line?.dispose();
  marker?.dispose();
  material?.dispose();
  line = marker = material = null;
}

// Đường xem trước của khán giả solo (xem previewStyle.js) hoặc null.
function audiencePreview() {
  const duel = duelOf();
  const kit = duel?.audience?.kits.find((p) => p.id === state.myId);
  if (!state.joined || !state.alive || state.dog || state.tableGame || isStunned()
    || !duel || duel.stage !== 'fight' || isFighter(duel) || !kit || (!kit.knives && !kit.tomatoes)) return null;
  const rules = duel.audience.rules;
  const from = { ...state.me, y: state.me.y + (state.crouching ? rules.crouchEyeHeight : rules.eyeHeight) * state.size };
  const path = predictThrow(from, state.yaw, state.pitch, rules, {
    groundAt, heightAt, isSupported, ring: state.ring, walls: duel.audience.blockers,
  });
  const ready = performance.now() >= kit.readyAt;
  return makePreview(path, { waiting: !ready, valid: !kit.knives || path.valid }); // cà chua rơi đâu cũng được, chỉ dao cần rơi trong võ đài
}

// Độ lệch của đầu đường so với đường thật (xem DUEL_THROW_PREVIEW.startOffset): sang phải và xuống dưới theo camera để nhìn thấy độ cong.
function leanOffset(enabled) {
  if (!enabled) return null;
  const { right, down, fade } = DUEL_THROW_PREVIEW.startOffset;
  const axes = aimAxes();
  const offset = new Vector3(axes.right.x * right - axes.up.x * down, -axes.up.y * down, axes.right.z * right - axes.up.z * down);
  offset.fade = fade;
  return offset;
}

// Vẽ đường bay và vòng điểm rơi: của khán giả solo, của skill ném vũ khí (fx/skillPreview.js), của cú nhảy đấm trời giáng (fx/leapPreview.js), hoặc của lựu đạn (fx/grenadePreview.js); không có thì dọn.
export function updateThrowPreview() {
  const shown = audiencePreview() ?? skillPreview() ?? leapPreview() ?? grenadePreview();
  if (!shown) return clearThrowPreview();
  const { path } = shown;
  const points = [];
  const lean = leanOffset(shown.offset);
  for (let i = 0; i < DUEL_THROW_PREVIEW.samples; i++) {
    const index = i / (DUEL_THROW_PREVIEW.samples - 1) * (path.points.length - 1);
    const a = path.points[Math.floor(index)];
    const b = path.points[Math.min(Math.floor(index) + 1, path.points.length - 1)];
    const point = Vector3.Lerp(new Vector3(a.x, a.y, a.z), new Vector3(b.x, b.y, b.z), index % 1);
    points.push(lean ? point.addInPlace(lean.scale((1 - Math.min(1, i / ((DUEL_THROW_PREVIEW.samples - 1) * lean.fade))) ** 2)) : point);
  }
  if (!material) {
    material = new StandardMaterial('throwPreviewMaterial', scene);
    material.disableLighting = true;
  }
  // Ống tròn (không phải LineSystem: đường kẻ luôn dày 1 pixel) cập nhật tại chỗ mỗi khung vì luôn đủ `samples` điểm.
  const radius = DUEL_THROW_PREVIEW.radius;
  line = MeshBuilder.CreateTube('throwPreviewPath', line
    ? { path: points, radius, instance: line }
    : { path: points, radius, tessellation: 8, updatable: true }, scene);
  line.material = material;
  line.isPickable = false;
  if (!marker) {
    marker = MeshBuilder.CreateTorus('throwPreviewTarget', {
      diameter: DUEL_THROW_PREVIEW.diameter, thickness: DUEL_THROW_PREVIEW.thickness, tessellation: 32,
    }, scene);
    marker.material = material;
    marker.isPickable = false;
  }
  material.emissiveColor = Color3.FromHexString(shown.color);
  const scale = shown.size / DUEL_THROW_PREVIEW.diameter; // nhảy đấm: vòng to bằng cả vùng nổ
  marker.scaling.set(scale, 1, scale);
  marker.position.set(path.landing.x, path.landing.y + DUEL_THROW_PREVIEW.lift, path.landing.z);
  marker.setEnabled(Number.isFinite(path.landing.y));
}
