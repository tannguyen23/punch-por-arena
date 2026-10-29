import { state } from '../state.js';
import { STATE_SEND_MS } from '../config.js';
import { showPause } from '../ui/hud.js';
import { handleMessage } from './handlers.js';

let ws = null;
let syncing = false;

export const send = (msg) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));

// Báo vị trí/tư thế của mình lên server theo chu kỳ.
function startStateSync() {
  if (syncing) return;
  syncing = true;
  setInterval(() => {
    if (state.myId === null || !state.alive) return;
    const { me } = state;
    send({ t: 'state', x: me.x, z: me.z, yaw: state.yaw, y: me.y, c: state.crouching ? 1 : 0, s: state.sprinting ? 1 : 0 });
  }, STATE_SEND_MS);
}

// intent: { create: true } để tạo phòng mới, hoặc { room: '427' } để vào phòng có sẵn.
export function connect(name, look, intent = {}) {
  if (ws) {
    ws.onclose = null; // đóng kết nối cũ (sau khi bị từ chối) mà không báo "mất kết nối"
    ws.close();
  }
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => send({ t: 'join', name, look, ...intent });
  ws.onclose = () => !state.kicked && showPause('Mất kết nối', 'Tải lại trang (F5) để vào lại'); // bị kick thì roomHandlers.js đã đưa về menu
  ws.onmessage = handleMessage;
  startStateSync();
}

// Bấm F ở phòng chờ: sẵn sàng / huỷ sẵn sàng.
export function toggleReady() {
  const { phase } = state.match;
  if (phase === 'lobby' || phase === 'countdown') send({ t: 'ready', ready: !state.ready });
}
