// Một phòng chơi: người chơi, vũ khí trên sân và trạng thái trận của riêng phòng đó. Các phòng độc lập hoàn toàn.
//
// phase (pha của phòng):
//   'lobby'     - phòng chờ: đi lại được nhưng chưa đánh được; mọi người bấm F (sẵn sàng)
//   'countdown' - đủ người và hơn một nửa số người sẵn sàng (READY_RATIO): đếm ngược 3-2-1
//   'playing'   - đang đánh, cứ định kỳ có máy bay thả hòm tiếp tế, thỉnh thoảng có bão (mưa, sét)
//   'ended'     - hết giờ, xem bảng xếp hạng rồi quay về phòng chờ
class Room {
  constructor(code, mapIds, initialMap) {
    this.code = code;
    this.ownerId = null; // chủ phòng: id người tạo phòng, chuyển cho người vào sớm nhất còn lại khi chủ thoát (host.js, leave.js)
    this.ownerName = ''; // tên chủ phòng hiện tại, hiện trong danh sách phòng
    this.mapIds = mapIds;
    this.mapIndex = 0;
    this.setMap(initialMap);
    this.players = new Map(); // id → người chơi đã vào phòng
    this.tableGames = new Map();
    this.pickups = new Map(); // id → hòm tiếp tế (đang rơi hoặc đã nằm trên sân)
    this.poops = new Map(); // id → cục shit của con chó trong sự kiện hoá chó: { id, x, y, z } (poop.js)
    this.nextPoopId = 1;
    this.nextPickupId = 1;
    this.rockets = []; // tên lửa đang bay
    this.nextRocketId = 1;
    this.grenades = []; // lựu đạn đang bay / đang nằm chờ nổ
    this.nextGrenadeId = 1;
    this.weather = { storm: false, endsAt: 0, nextAt: 0 }; // bão của trận đang chơi (weather.js)
    this.strikes = []; // sét đã báo trước, sắp đánh xuống (lightning.js)
    this.nextStrikeAt = 0;
    this.lightningWave = null;
    this.nextStrikeId = 1;
    this.lastTargetedAt = new Map(); // id người chơi → mốc Date.now() lần gần nhất bị sét nhắm
    this.icePatches = []; // vũng băng do lựu đạn băng tạo ra: { id, x, z, r, endsAt } (ice.js)
    this.nuke = null; // quả bom hạt nhân đang tới: { id, ownerId, at (điểm rơi [x, y, z]), view (tin 'nuke' đã gửi), startedAt, timer } (nuke.js)
    this.nextNukeId = 1;
    this.event = null; // sự kiện đang chạy: { kind, targetId, bounty, introEndsAt, endsAt } (events.js)
    this.eventPlan = []; // các sự kiện sẽ xảy ra trong trận: { kind, at } (events.js)
    this.lastEventKind = null; // giữ qua trận mới, chỉ cập nhật khi sự kiện thật sự bắt đầu
    this.frozenUntil = 0; // mốc Date.now() hết đứng hình (restrictions.js)
    this.phase = 'lobby';
    this.endsAt = 0; // mốc Date.now() hết pha hiện tại (countdown / playing / ended)
    this.nextAirdropAt = 0; // mốc Date.now() máy bay tiếp theo xuất hiện (chỉ có nghĩa khi đang 'playing')
    this.nextPotionAt = 0; // mốc Date.now() lọ thuốc tiếp theo xuất hiện (chỉ có nghĩa khi đang 'playing', xem potionDrops.js)
    this.ranking = []; // bảng xếp hạng của trận vừa kết thúc
  }

  setMap(map) {
    this.mapData = map.data;
    this.terrain = map.terrain;
    this.punchBlockers = map.punchBlockers;
  }

  advanceMap(getMap) {
    this.mapIndex = (this.mapIndex + 1) % this.mapIds.length;
    this.setMap(getMap(this.mapIds[this.mapIndex]));
  }
}

module.exports = { Room };
