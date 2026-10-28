// Mọi loại tường đều chặn đường đi. `blocksPunch`: có chặn đòn đấm xuyên qua không.
// Thêm loại mới ở đây và thêm hàm dựng mesh cùng tên trong public/js/world/walls.js.
module.exports = {
  wall: { blocksPunch: true },
  rope: { blocksPunch: false },
};
