import { scene } from '../core/scene.js';
import { duelOf } from '../core/duel.js';
import { positionAt } from '../core/throwPath.js';
import { createWeaponModel } from '../entities/weapons/index.js';
import { DUEL_AUDIENCE_FX } from '../config.js';

const { MeshBuilder, StandardMaterial, Color3, Vector3 } = BABYLON;
const live = new Map();
const splashes = [];
let red;
let yellow;

function materials() {
  if (red) return;
  red = new StandardMaterial('tomatoRed', scene);
  red.diffuseColor = Color3.FromHexString(DUEL_AUDIENCE_FX.red);
  yellow = new StandardMaterial('duelLanding', scene);
  yellow.emissiveColor = Color3.FromHexString(DUEL_AUDIENCE_FX.markerColor);
  yellow.disableLighting = true;
}

function createFlight(flight) {
  materials();
  const entry = { root: null, marker: null };
  live.set(flight.id, entry);
  if (flight.kind === 'tomato') {
    entry.root = MeshBuilder.CreateSphere('audienceTomato', { diameter: DUEL_AUDIENCE_FX.diameter, segments: 8 }, scene);
    entry.root.material = red;
  } else {
    createWeaponModel('knife').then((root) => {
      if (live.get(flight.id) !== entry) return root?.dispose();
      entry.root = root;
    });
    entry.marker = MeshBuilder.CreateTorus('duelLandingMarker', {
      diameter: DUEL_AUDIENCE_FX.markerDiameter, thickness: DUEL_AUDIENCE_FX.markerThickness, tessellation: 32,
    }, scene);
    entry.marker.position.copyFromFloats(flight.landing.x, flight.landing.y + DUEL_AUDIENCE_FX.markerLift, flight.landing.z);
    entry.marker.material = yellow;
  }
  return entry;
}

export function tomatoImpact(at) {
  materials();
  const root = MeshBuilder.CreateSphere('tomatoImpact', { diameter: DUEL_AUDIENCE_FX.splashDiameter, segments: 8 }, scene);
  root.position.copyFromFloats(at.x, at.y, at.z);
  root.material = red;
  splashes.push({ root, until: performance.now() + DUEL_AUDIENCE_FX.splashMs });
}

export function clearAudienceEffects() {
  for (const entry of live.values()) { entry.root?.dispose(); entry.marker?.dispose(); }
  live.clear();
  for (const splash of splashes) splash.root.dispose();
  splashes.length = 0;
}

export function updateAudienceEffects() {
  const duel = duelOf();
  if (!duel || duel.stage !== 'fight') return clearAudienceEffects();
  const flights = duel.audience?.flights ?? [];
  const now = performance.now();
  for (const [id, entry] of live) {
    if (flights.some((f) => f.id === id && now - f.startedAt < f.duration)) continue;
    entry.root?.dispose();
    entry.marker?.dispose();
    live.delete(id);
  }
  for (const flight of flights) {
    const elapsed = now - flight.startedAt;
    if (elapsed >= flight.duration) continue;
    const entry = live.get(flight.id) ?? createFlight(flight);
    if (!entry.root) continue;
    const t = Math.max(0, elapsed) / 1000;
    const { x, y, z } = positionAt(flight, t);
    entry.root.position.copyFrom(new Vector3(x, y, z));
    entry.root.rotation.x = t * DUEL_AUDIENCE_FX.spin;
  }
  for (let i = splashes.length - 1; i >= 0; i--) {
    const splash = splashes[i];
    if (now < splash.until) {
      splash.root.scaling.setAll(Math.max(0, (splash.until - now) / DUEL_AUDIENCE_FX.splashMs));
      continue;
    }
    splash.root.dispose();
    splashes.splice(i, 1);
  }
}
