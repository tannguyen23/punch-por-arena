import { scene } from '../core/scene.js';
import { heightAt } from '../core/terrain.js';
import { NUKE } from '../config.js';

const { Color3, Mesh, MeshBuilder, StandardMaterial, VertexData } = BABYLON;

// Vùng cảnh báo đỏ của đợt oanh kích, hiện từ lúc còi báo động kêu tới lúc bom nổ: mỗi quả bom một tường đỏ mờ hình trụ ở mép vùng nổ
// (`radius`, ngoài đó an toàn) và mặt đỏ đậm hơn phủ lên đất trong vành chết (`killRadius`). Nhấp nháy để người chơi thấy là phải chạy.
// Material dùng chung, tạo một lần, không huỷ theo mesh.

const RINGS = 10; // số vòng đồng tâm của mặt vành chết: đủ mịn để bám theo đồi
const SEGMENTS = 48;
const LIFT = 0.15; // nổi trên mặt đất chút cho khỏi nhấp nháy với đất (z-fighting)
const SINK = 2; // chân tường chôn xuống đất cho khỏi hở khi đất lồi lõm
const VOID_DROP = 3; // đất thấp hơn tâm quá ngần này (hư không của đảo trời) thì để phẳng ngang tâm

let materials = null;
let root = null;
let clock = 0;

function makeMaterial(name) {
  const material = new StandardMaterial(name, scene);
  material.emissiveColor = new Color3(...NUKE.zone.color);
  material.disableLighting = true;
  material.backFaceCulling = false;
  return material;
}

const sharedMaterials = () => (materials ??= { wall: makeMaterial('nukeZoneWall'), kill: makeMaterial('nukeZoneKill') });

// Mặt tròn chia lưới cực (vòng × tia) để từng đỉnh lấy độ cao của đất tại đó; toạ độ tương đối với tâm `at`.
function killDisc(at, r) {
  const positions = [0, 0, 0];
  const indices = [];
  const ground = (x, z) => {
    const h = heightAt(at[0] + x, at[2] + z);
    return (h < at[1] - VOID_DROP ? at[1] : h) - at[1] + LIFT;
  };
  positions[1] = ground(0, 0);
  for (let ring = 1; ring <= RINGS; ring++) {
    const d = (r * ring) / RINGS;
    for (let s = 0; s < SEGMENTS; s++) {
      const a = (s / SEGMENTS) * Math.PI * 2;
      const x = Math.sin(a) * d;
      const z = Math.cos(a) * d;
      positions.push(x, ground(x, z), z);
    }
  }
  const vertex = (ring, s) => (ring === 0 ? 0 : 1 + (ring - 1) * SEGMENTS + (s % SEGMENTS));
  for (let ring = 0; ring < RINGS; ring++) {
    for (let s = 0; s < SEGMENTS; s++) {
      if (ring === 0) indices.push(0, vertex(1, s), vertex(1, s + 1));
      else indices.push(vertex(ring, s), vertex(ring + 1, s), vertex(ring + 1, s + 1), vertex(ring, s), vertex(ring + 1, s + 1), vertex(ring, s + 1));
    }
  }
  const mesh = new Mesh('nukeZoneKill', scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.applyToMesh(mesh);
  return mesh;
}

// Dựng các vùng đỏ quanh từng điểm rơi trong `points` = [{ at: [x, y, z], radius, killRadius }] (tin 'nuke' của server).
export function showNukeZones(points) {
  clearNukeZone();
  const { wall: wallMaterial, kill: killMaterial } = sharedMaterials();
  root = new BABYLON.TransformNode('nukeZones', scene);
  const { height } = NUKE.zone;
  for (const { at, radius, killRadius } of points) {
    const zone = new BABYLON.TransformNode('nukeZone', scene);
    zone.parent = root;
    zone.position.set(at[0], at[1], at[2]);
    const wall = MeshBuilder.CreateCylinder('nukeZoneWall', { diameter: radius * 2, height, tessellation: SEGMENTS, cap: Mesh.NO_CAP, sideOrientation: Mesh.DOUBLESIDE }, scene);
    wall.position.y = height / 2 - SINK;
    wall.material = wallMaterial;
    const kill = killDisc(at, killRadius);
    kill.material = killMaterial;
    for (const mesh of [wall, kill]) {
      mesh.parent = zone;
      mesh.isPickable = false;
    }
  }
  clock = 0;
  updateNukeZone(0);
}

// Gọi mỗi khung hình: nhấp nháy `pulse` lần mỗi giây.
export function updateNukeZone(dt) {
  if (!root) return;
  clock += dt;
  const beat = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(clock * NUKE.zone.pulse * Math.PI * 2));
  materials.wall.alpha = NUKE.zone.alpha * beat;
  materials.kill.alpha = NUKE.zone.killAlpha * beat;
}

// Bom nổ / bị huỷ: bỏ vùng đỏ (material dùng chung giữ lại cho quả sau).
export function clearNukeZone() {
  root?.dispose(false, false);
  root = null;
}
