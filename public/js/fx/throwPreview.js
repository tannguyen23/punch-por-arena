import { scene } from '../core/scene.js';
import { state } from '../state.js';
import { duelOf, isFighter } from '../core/duel.js';
import { isStunned } from '../core/freeze.js';
import { groundAt, heightAt, isSupported } from '../core/terrain.js';
import { predictThrow } from '../core/throwPath.js';
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

export function updateThrowPreview() {
  const duel = duelOf();
  const kit = duel?.audience?.kits.find((p) => p.id === state.myId);
  if (!state.joined || !state.alive || state.dog || state.tableGame || isStunned()
    || !duel || duel.stage !== 'fight' || isFighter(duel) || !kit || (!kit.knives && !kit.tomatoes)) return clearThrowPreview();
  const rules = duel.audience.rules;
  const from = { ...state.me, y: state.me.y + (state.crouching ? rules.crouchEyeHeight : rules.eyeHeight) * state.size };
  const path = predictThrow(from, state.yaw, state.pitch, rules, {
    groundAt, heightAt, isSupported, ring: state.ring, walls: duel.audience.blockers,
  });
  const points = [];
  for (let i = 0; i < DUEL_THROW_PREVIEW.samples; i++) {
    const index = i / (DUEL_THROW_PREVIEW.samples - 1) * (path.points.length - 1);
    const a = path.points[Math.floor(index)];
    const b = path.points[Math.min(Math.floor(index) + 1, path.points.length - 1)];
    points.push(Vector3.Lerp(new Vector3(a.x, a.y, a.z), new Vector3(b.x, b.y, b.z), index % 1));
  }
  const lines = [];
  for (let i = 0; i + 1 < points.length; i += 2) lines.push([points[i], points[i + 1]]);
  line = MeshBuilder.CreateLineSystem('throwPreviewPath', line
    ? { lines, instance: line }
    : { lines, updatable: true }, scene);
  const ready = performance.now() >= kit.readyAt;
  const color = Color3.FromHexString(!ready ? DUEL_THROW_PREVIEW.wait : kit.knives && !path.valid ? DUEL_THROW_PREVIEW.invalid : DUEL_THROW_PREVIEW.valid);
  line.color = color;
  line.isPickable = false;
  if (!marker) {
    marker = MeshBuilder.CreateTorus('throwPreviewTarget', {
      diameter: DUEL_THROW_PREVIEW.diameter, thickness: DUEL_THROW_PREVIEW.thickness, tessellation: 32,
    }, scene);
    material = new StandardMaterial('throwPreviewMaterial', scene);
    material.disableLighting = true;
    marker.material = material;
    marker.isPickable = false;
  }
  material.emissiveColor = color;
  marker.position.set(path.landing.x, path.landing.y + DUEL_THROW_PREVIEW.lift, path.landing.z);
  marker.setEnabled(Number.isFinite(path.landing.y));
}
