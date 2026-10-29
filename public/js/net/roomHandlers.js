import { state } from '../state.js';
import { announce } from '../ui/matchHud.js';
import { KICKED_NOTICE_KEY } from '../config.js';

export const roomHandlers = {
  // Chủ phòng thoát: quyền chủ phòng chuyển cho người khác (server/game/leave.js).
  host(m) {
    if (state.room) state.room.hostId = m.id;
    announce(m.id === state.myId ? 'Bạn là chủ phòng mới' : `${m.name} là chủ phòng mới`);
  },

  // Mình bị chủ phòng kick: về menu (tải lại trang, bỏ ?room= trong địa chỉ để không tự vào lại đúng phòng đó) và báo lý do ở đó.
  kicked() {
    state.kicked = true; // ws.onclose (net/socket.js) không hiện "Mất kết nối" đè lên
    try {
      sessionStorage.setItem(KICKED_NOTICE_KEY, '1'); // menu báo lý do sau khi tải lại trang (ui/menu.js đọc và xoá)
    } catch { /* trình duyệt chặn lưu: vẫn về menu, chỉ không có dòng báo */ }
    document.exitPointerLock();
    location.replace(location.pathname);
  },
};
