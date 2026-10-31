import { state } from '../state.js';
import { STATE_SEND_MS } from '../config.js';
import { showPause } from '../ui/hud.js';
import { hideLoading } from '../ui/loadingScreen.js';
import { handleMessage } from './handlers.js';
import { applyTableGames } from './tableHandlers.js';

let ws = null;
let syncing = false;

export const send = (msg) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));

// Báo vị trí/tư thế của mình lên server theo chu kỳ.
function startStateSync() {
  if (syncing) return;
  syncing = true;
  setInterval(() => {
    if (state.myId === null || !state.alive || state.spectator) return; // khán giả không có nhân vật để báo vị trí
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
  ws.onopen = () => send({ t: 'join', name, look, ...(state.spectator ? { spectator: true } : {}), ...intent });
  ws.onclose = () => {
    hideLoading(); // kết nối đứt khi đang loading: không kẹt ở màn loading
    applyTableGames([]);
    if (!state.kicked) showPause('Mất kết nối', 'Tải lại trang (F5) để vào lại');
  };
  ws.onmessage = handleMessage;
  startStateSync();
}

// Bấm F ở phòng chờ: sẵn sàng / huỷ sẵn sàng.
export function toggleReady() {
  if (state.tableGame || state.spectator) return; // khán giả không có lượt sẵn sàng
  const { phase } = state.match;
  if (phase === 'lobby' || phase === 'countdown') send({ t: 'ready', ready: !state.ready });
}
