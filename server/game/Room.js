// Một phòng chơi: người chơi, vũ khí trên sân và trạng thái trận của riêng phòng đó. Các phòng độc lập hoàn toàn.
//
// phase (pha của phòng):
//   'lobby'     - phòng chờ: đi lại được nhưng chưa đánh được; mọi người bấm F (sẵn sàng)
//   'countdown' - đủ người và ai cũng sẵn sàng: đếm ngược 3-2-1
//   'playing'   - đang đánh, có các đợt vũ khí rơi theo lịch
//   'ended'     - hết giờ, xem bảng xếp hạng rồi quay về phòng chờ
class Room {
  constructor(code) {
    this.code = code;
    this.players = new Map(); // id → người chơi đã vào phòng
    this.pickups = new Map(); // id → vũ khí đang nằm trên sân
    this.nextPickupId = 1;
    this.phase = 'lobby';
    this.endsAt = 0; // mốc Date.now() hết pha hiện tại (countdown / playing / ended)
    this.waves = []; // lịch các đợt vũ khí rơi của trận hiện tại
    this.ranking = []; // bảng xếp hạng của trận vừa kết thúc
  }
}

module.exports = { Room };
