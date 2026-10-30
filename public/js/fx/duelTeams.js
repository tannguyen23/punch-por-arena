import { scene, solidMaterial } from '../core/scene.js';
import { remotes } from '../state.js';
import { duelOf, sideOf } from '../core/duel.js';
import { DUEL_TEAM_FX } from '../config.js';

const markers = new Map();
let materials = null;

function createMarker(side) {
  materials ??= DUEL_TEAM_FX.colors.map((hex) => {
    const material = solidMaterial(BABYLON.Color3.FromHexString(hex));
    material.emissiveColor = material.diffuseColor;
    material.disableLighting = true;
    return material;
  });
  const ring = BABYLON.MeshBuilder.CreateTorus('duelTeamRing', {
    diameter: DUEL_TEAM_FX.diameter, thickness: DUEL_TEAM_FX.thickness,
  }, scene);
  const head = BABYLON.MeshBuilder.CreateSphere('duelTeamMarker', { diameter: DUEL_TEAM_FX.markerSize }, scene);
  ring.material = head.material = materials[side];
  ring.isPickable = head.isPickable = false;
  return { ring, head, side };
}

export function updateDuelTeams() {
  const duel = duelOf();
  const seen = new Set();
  if (duel) {
    for (const [id, r] of remotes) {
      const side = sideOf(duel, id);
      if (side < 0 || r.dead) continue;
      seen.add(id);
      let marker = markers.get(id);
      if (!marker) {
        marker = createMarker(side);
        markers.set(id, marker);
      }
      marker.ring.material = marker.head.material = materials[side];
      marker.ring.position.copyFrom(r.root.position);
      marker.ring.position.y += DUEL_TEAM_FX.lift;
      marker.ring.scaling.setAll(r.size);
      marker.head.position.copyFrom(r.root.position);
      marker.head.position.y += DUEL_TEAM_FX.headHeight * r.size;
    }
  }
  for (const [id, marker] of markers) {
    if (seen.has(id)) continue;
    marker.ring.dispose();
    marker.head.dispose();
    markers.delete(id);
  }
}
