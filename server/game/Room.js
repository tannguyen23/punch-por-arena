// Một phòng chơi: người chơi, vũ khí trên sân và trạng thái trận của riêng phòng đó. Các phòng độc lập hoàn toàn.
//
// phase (pha của phòng):
//   'lobby'     - phòng chờ: đi lại được nhưng chưa đánh được; mọi người bấm F (sẵn sàng)
//   'countdown' - đủ người và ai cũng sẵn sàng: đếm ngược 3-2-1
//   'playing'   - đang đánh, cứ định kỳ có máy bay thả hòm tiếp tế, thỉnh thoảng có bão (mưa, sét)
//   'ended'     - hết giờ, xem bảng xếp hạng rồi quay về phòng chờ
class Room {
  constructor(code) {
    this.code = code;
    this.players = new Map(); // id → người chơi đã vào phòng
    this.pickups = new Map(); // id → hòm tiếp tế (đang rơi hoặc đã nằm trên sân)
    this.nextPickupId = 1;
    this.rockets = []; // tên lửa đang bay
    this.nextRocketId = 1;
    this.grenades = []; // lựu đạn đang bay / đang nằm chờ nổ
    this.nextGrenadeId = 1;
    this.weather = { storm: false, endsAt: 0, nextAt: 0 }; // bão của trận đang chơi (weather.js)
    this.strikes = []; // sét đã báo trước, sắp đánh xuống (lightning.js)
    this.nextStrikeAt = 0;
    this.nextStrikeId = 1;
    this.lastTargetedAt = new Map(); // id người chơi → mốc Date.now() lần gần nhất bị sét nhắm
    this.icePatches = []; // vũng băng do lựu đạn băng tạo ra: { id, x, z, r, endsAt } (ice.js)
    this.nuke = null; // quả bom hạt nhân đang tới: { id, ownerId, at, view (tin 'nuke' đã gửi), startedAt, timer }
    this.nextNukeId = 1;
    this.phase = 'lobby';
    this.endsAt = 0; // mốc Date.now() hết pha hiện tại (countdown / playing / ended)
    this.nextAirdropAt = 0; // mốc Date.now() máy bay tiếp theo xuất hiện (chỉ có nghĩa khi đang 'playing')
    this.ranking = []; // bảng xếp hạng của trận vừa kết thúc
    this.result = null; // kết quả trận vừa kết thúc: { reason: 'time' | 'nuke', winnerId?, winnerName?, showIn } (match.js)
  }
}

module.exports = { Room };
