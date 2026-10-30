import { state, remotes } from '../state.js';
import { placeOnScreen } from '../core/screenPoint.js';
import { camera } from '../player/camera.js';
import { aimAxes } from '../player/aim.js';
import { TABLE_GAME } from '../config.js';
import { TABLE_TEXT } from './tableText.js';

const root = document.getElementById('table-invites');
const tags = new Map();

export function updateTableInvites() {
  const waiting = new Set(state.tableGames.filter((game) => game.stage === 'waiting').map((game) => game.players[0]));
  for (const [id, tag] of tags) {
    if (waiting.has(id)) continue;
    tag.remove();
    tags.delete(id);
  }
  root.hidden = !state.joined || Boolean(state.tableGame);
  for (const id of waiting) {
    if (id === state.myId) continue;
    let tag = tags.get(id);
    if (!tag) {
      tag = document.createElement('div');
      tag.className = 'table-invite';
      tag.textContent = TABLE_TEXT.invitation;
      root.append(tag);
      tags.set(id, tag);
    }
    const remote = remotes.get(id);
    tag.hidden = !remote || remote.dead;
    if (tag.hidden) continue;
    const pos = remote.root.position;
    const dir = { x: pos.x - camera.position.x, y: pos.y + TABLE_GAME.tagHeight * remote.size - camera.position.y, z: pos.z - camera.position.z };
    const at = placeOnScreen(dir, aimAxes(), camera.fov, innerWidth, innerHeight, TABLE_GAME.tagMargin);
    tag.hidden = !at.onScreen || Math.hypot(dir.x, dir.z) > TABLE_GAME.inviteRange;
    if (!tag.hidden) tag.style.transform = `translate(${at.x}px, ${at.y}px) translate(-50%, -100%)`;
  }
}
