import { scene, solidMaterial } from '../core/scene.js';
import { state, remotes } from '../state.js';
import { duelOf, sideOf } from '../core/duel.js';
import { DUEL_TEAM_BAR, DUEL_TEAM_FX } from '../config.js';

const { Color3 } = BABYLON;

const markers = new Map();
let materials = null;

// Màu thanh máu dùng lại màu đội của vòng / chấm trên đầu, cộng đỏ cho địch và xanh mặc định cho người ngoài trận.
const barColors = {
  enemy: Color3.FromHexString(DUEL_TEAM_BAR.enemy),
  neutral: Color3.FromHexString(DUEL_TEAM_BAR.neutral),
  team: DUEL_TEAM_FX.colors.map((hex) => Color3.FromHexString(hex)),
};

function createMarker(side) {
  materials ??= barColors.team.map((color) => {
    const material = solidMaterial(color);
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

// Thanh máu trên đầu: khi mình là võ sĩ, đội khác đỏ (địch), đội mình màu đội mình; người xem thấy màu từng đội;
// người không thuộc trận (hoặc ngoài sự kiện) giữ xanh mặc định. Chỉ ghi material khi màu đổi.
function paintBar(r, side, mySide) {
  const color = side < 0 ? barColors.neutral
    : mySide >= 0 && side !== mySide ? barColors.enemy
    : barColors.team[side];
  if (r.barColor === color) return;
  r.barColor = color;
  r.fill.material.diffuseColor.copyFrom(color);
  r.fill.material.emissiveColor.copyFrom(color);
}

export function updateDuelTeams() {
  const duel = duelOf();
  const mySide = duel ? sideOf(duel, state.myId) : -1;
  const seen = new Set();
  for (const [id, r] of remotes) {
    const side = duel ? sideOf(duel, id) : -1;
    paintBar(r, side, mySide);
    if (!duel || side < 0 || r.dead) continue;
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
  for (const [id, marker] of markers) {
    if (seen.has(id)) continue;
    marker.ring.dispose();
    marker.head.dispose();
    markers.delete(id);
  }
}
