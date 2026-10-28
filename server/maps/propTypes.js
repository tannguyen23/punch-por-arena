// Bán kính va chạm (hình tròn trên mặt sân) của từng loại vật phẩm. 0 = chỉ để trang trí, đi xuyên qua được.
// Thêm loại mới ở đây và thêm hàm dựng mesh cùng tên trong public/js/world/props.js.
module.exports = {
  tree: { radius: 0.5 },
  rock: { radius: 0.8 },
  table: { radius: 0.9 },
  chair: { radius: 0.35 },
  crate: { radius: 0.7 },
  post: { radius: 0.2 },
  bush: { radius: 0 },
  ringMat: { radius: 0 },
};
