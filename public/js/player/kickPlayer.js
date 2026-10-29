import { send } from '../net/socket.js';

// Chủ phòng kick một người ra khỏi phòng (server kiểm tra lại quyền, xem server/game/host.js).
export const kickPlayer = (id) => send({ t: 'kick', id });
