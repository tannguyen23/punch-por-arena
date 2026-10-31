export const GUIDE_SECTIONS = [
  {
    id: 'start', icon: '🚩', title: 'Vào trận', mission: 'Vào phòng → Sẵn sàng → Giành điểm',
    cards: [
      { icon: '①', title: 'Chọn phòng', text: 'Nhập tên, bấm Bắt đầu rồi tạo phòng mới hoặc vào phòng đang mở.', badge: 'Chơi cùng bạn bè' },
      { icon: '②', title: 'Mời bạn & sẵn sàng', text: 'Gửi link hoặc mã phòng cho bạn. Đủ người và hơn nửa phòng sẵn sàng thì bắt đầu.', keys: [['L', 'Sao chép link'], ['F', 'Sẵn sàng / huỷ']] },
      { icon: '③', title: 'Giành điểm', text: 'Hạ đối thủ, thắng sự kiện và chơi cờ để kiếm điểm. Hết giờ, người nhiều điểm nhất thắng.', badge: 'Điểm quyết định thứ hạng' },
      { icon: '☷', title: 'Xem người chơi', text: 'Mở danh sách để xem điểm, hạ gục và chủ phòng. Chủ phòng có thể kick người khác.', keys: [['Tab', 'Danh sách người chơi']] },
    ],
  },
  {
    id: 'move', icon: '⌨', title: 'Di chuyển', mission: 'Giữ khoảng cách · Né đòn · Tận dụng địa hình',
    cards: [
      { icon: '↔', title: 'Đi & quan sát', keys: [['W A S D', 'Di chuyển'], ['Chuột', 'Nhìn quanh']], text: 'Bấm vào sân để khoá chuột và điều khiển góc nhìn.' },
      { icon: '⚡', title: 'Chạy nước rút', keys: [['Shift', 'Giữ để chạy nhanh']], text: 'Chạy tốn thể lực. Ngừng chạy để thanh lực hồi lại.' },
      { icon: '↟', title: 'Nhảy & ngồi', keys: [['Space', 'Nhảy'], ['C', 'Giữ để ngồi']], text: 'Lội nước sẽ chậm hơn; đi qua cầu để giữ tốc độ.' },
      { icon: '⚙', title: 'Điều chỉnh trải nghiệm', keys: [['Esc', 'Thả chuột'], ['M', 'Tắt / bật tiếng']], text: 'Trong Cài đặt, chỉnh góc nhìn và độ nhạy chuột cho vừa tay.' },
    ],
  },
  {
    id: 'combat', icon: '🥊', title: 'Chiến đấu', mission: 'Ngắm đúng · Quản lý đạn · Sống sót',
    cards: [
      { icon: '🥊', title: 'Đấm & bắn', keys: [['Chuột trái', 'Đánh / bắn']], text: 'Mọi vũ khí chỉ đánh bằng chuột trái. Một số vũ khí cho phép giữ chuột để đánh liên tục.' },
      { icon: '🗡️', title: 'Ném vũ khí', keys: [['Giữ chuột phải', 'Ngắm'], ['Chuột trái', 'Ném']], text: 'Mọi vũ khí cận chiến trừ hai loại găng đều ném được: giữ chuột phải để hiện đường bay xanh/đỏ/vàng, bấm chuột trái để ném. Ném xong là mất vũ khí. Thả chuột phải để huỷ.', badge: 'Rìu 85 · Giáo 65 · Kiếm 55 · Dao chiến đấu 50 · Dao găm 35' },
      { icon: '🚀', title: 'Dash động cơ phản lực', keys: [['E', 'Lao 15m theo hướng nhìn']], text: 'Mọi người đeo động cơ sau lưng. Bấm E để lao thẳng 15m theo hướng bạn đang nhìn (nhìn lên thì bay lên), xong còn lơ lửng thì động cơ giữ bạn liệng xuống chậm tới khi chạm đất. Dash không gây sát thương và dừng trước tường.', badge: 'Hồi chiêu 18 giây' },
      { icon: '🔄', title: 'Thay băng', keys: [['R', 'Thay băng đạn']], text: 'Súng lục: 12 viên/băng, tổng 36 viên. AK: 30 viên/băng, tổng 90 viên. Thay băng mất 1,4 / 2,2 giây, không bắn trong lúc thay. Đổi vũ khí sẽ huỷ thay băng.', badge: 'HUD: trong băng / dự trữ' },
      { icon: '🚀', title: 'Tên lửa huyền thoại', text: 'Nhặt được 4 quả. Nổ 270 sát thương ở tâm, giảm theo khoảng cách trong bán kính 12m. Tường vẫn chặn sức nổ; đứng gần sẽ tự dính.', badge: 'Mạnh và cực hiếm: 1%' },
      { icon: '💣', title: 'Ném lựu đạn', keys: [['Giữ chuột trái', 'Ngắm ném xa'], ['Giữ chuột phải', 'Ngắm tung nhẹ'], ['Thả chuột', 'Ném']], text: 'Đường nét đứt chỉ tới chỗ lựu đạn chạm đất lần đầu, sau đó nó còn nảy và lăn. Lựu đạn có thể gây nổ, làm choáng hoặc tạo vũng băng trơn trượt.' },
      { icon: '♥', title: 'Hồi máu & bị hạ', text: 'Không trúng đòn 10 giây thì tự hồi 3 máu/giây. Bị hạ sẽ rơi vũ khí và hồi sinh sau đó.', badge: 'Tránh đòn để hồi phục' },
      { icon: '✈', title: 'Gọi radio', keys: [['T', 'Gọi hòm radio']], text: 'Hạ liên tiếp 5 người không chết để gọi hòm khói vàng. Nhặt radio, ngắm rồi dùng để gọi một loạt bom rải khắp sân (5 quả, phủ phần lớn vùng đất).', badge: 'Ai cũng có thể nhặt hòm' },
    ],
  },
  {
    id: 'items', icon: '🎒', title: 'Vật phẩm', mission: 'Nhặt đúng món · Đổi đúng lúc',
    cards: [
      { icon: '📦', title: 'Hòm tiếp tế', text: 'Theo khói đỏ tới hòm. Chờ hòm chạm đất rồi chạy tới để tự nhặt; đôi khi có thêm lựu đạn.', badge: 'Phòng đông → tiếp tế nhiều hơn' },
      { icon: '💎', title: 'Độ hiếm vũ khí', text: 'Thường 50%: dao găm, kiếm. Hiếm 25%: dao chiến đấu, rìu, giáo. Sử thi 10%: hai loại găng. Huyền thoại 15%: súng lục, AK, tên lửa. Nhãn trắng / xanh / tím / vàng hiện trên túi và bảng vũ khí.', badge: '85% cận chiến · 15% súng' },
      { icon: '🎒', title: 'Túi vũ khí', keys: [['1 · 2 · 3 · 4', 'Chọn ô · trống = tay không'], ['X', 'Cất vũ khí (tay không)'], ['G', 'Vứt vũ khí']], text: 'Túi đầy thì vứt bớt. Nhặt đồ khi đang cầm vũ khí thì chỉ thêm vào túi, không đổi món đang cầm. Hết đạn hoặc gãy thì vũ khí tự hỏng và biến mất.' },
      { icon: '🧪', title: 'Thuốc hoá to / nhỏ', text: 'Lọ thuốc có cột sáng vàng. Chạy tới là uống ngay, không chiếm ô; đổi kích thước, máu và tốc độ trong thời gian ngắn. Hoá to có ba cỡ ngẫu nhiên: ×2 (200 máu), ×3 (300 máu), ×4 (400 máu). Khổng lồ chỉ chịu 25% sát thương súng và có khiên xanh xoay quanh người.', badge: 'Nhặt là uống' },
      { icon: '💥', title: 'Đấm trời giáng', keys: [['Q', 'Giữ để gồng và ngắm → thả để nhảy đấm']], text: 'Khi hoá to (cầm vũ khí vẫn dùng được): nhảy xa tới 30m rồi đấm xuống, đánh diện rộng và hất văng đối thủ. Gồng càng lâu càng mạnh.' },
      { icon: '☁', title: 'Cẩn thận cơn bão', text: 'Mỗi đợt 5 tia sét rải nhiều vùng. Nghe tiếng lách tách thì chạy khỏi chỗ đó ngay (không còn vòng cảnh báo); trúng sét bị điện giật, không di chuyển hay tấn công được 2 giây.', badge: '5 tia / 5 giây · Nghỉ 8 giây' },
    ],
  },
  {
    id: 'events', icon: '🧨', title: 'Sự kiện', mission: 'Đọc nhiệm vụ của bạn → Chơi đúng vai → Nhận thưởng',
    cards: [
      { icon: '🐕', title: 'Hoá chó', text: 'Thành chó: chạy trốn, bấm Q thả bãi làm chậm. Người khác: đuổi và hạ chó. Chó sống hết giờ hoặc người hạ chó nhận thưởng.', badge: 'Thưởng 150đ' },
      { icon: '🥊', title: 'Đấu đội võ đài', text: 'Chia hai đội cân người: 4 người đấu 2v2, 6 người đấu 3v3. Số lẻ dư một người cược. Hạ hết đối phương, không đánh đồng đội. Không có người xem thì bỏ cược; đủ người cược thì đánh ngay, tối đa 5 giây. Đồ trong túi được cất tạm, xong trả lại.', badge: 'Mỗi người đội thắng +100đ · Cược ±50đ' },
      { icon: '🍅', title: 'Khán giả quậy phá', text: 'G ném 1 dao dùng 3 lần; chuột trái ném 2 cà chua, cách nhau 3 giây. Ngắm theo nét đứt: xanh hợp lệ, đỏ dao ngoài võ đài, vàng đang hồi. Dao ai nhặt cũng được. Cà chua chỉ bẹp đỏ mép màn hình 0,5 giây, không gây dame hay khống chế.', badge: 'Đồ riêng của sự kiện · Không mất đồ trong túi' },
      { icon: '🧨', title: 'Chuyền TNT', text: 'Người cầm chạy nhanh hơn 25%; đấm trúng người khác để chuyền. TNT nổ sau 15–45 giây, chuyền không đặt lại giờ.', badge: 'Cầm cuối: bị hạ, −100đ · Còn lại +30đ' },
      { icon: '🛡', title: 'Luật riêng của TNT', text: 'Chỉ TNT cuối sự kiện gây sát thương. Tạm ngưng hòm mới, potion vẫn rơi và nhặt được. Điểm thua có thể âm.', badge: 'Đấm để chuyền, không gây dame' },
    ],
    note: 'Đầu mỗi sự kiện, cả phòng đứng yên đọc luật. Màn hình sẽ chỉ rõ nhiệm vụ và phần thưởng của vai bạn.',
  },
  {
    id: 'table', icon: '▦', title: 'Cờ 3×3', mission: 'Xếp 3 quân thẳng hàng → Giành điểm',
    cards: [
      { icon: '▦', title: 'Ngồi vào bàn', keys: [['F', 'Chơi cờ khi gần bàn']], text: 'Hai người luân phiên đặt X / O. Xếp 3 quân ngang, dọc hoặc chéo để thắng.', badge: 'Thắng +75đ · Thua −75đ' },
      { icon: '↻', title: 'Lật bàn', text: 'Nếu đối thủ có thể thắng ở lượt tới, bạn có thể lật bàn và chịu −50đ. Đối thủ vẫn nhận +75đ.', badge: 'Điểm có thể âm' },
      { icon: '🛡', title: 'An toàn ở bàn', text: 'Khi ngồi chơi được miễn sát thương. Người quanh bàn nhìn thấy quân cờ của cả hai.', badge: 'Tạm nghỉ đấm nhau' },
      { icon: '🚪', title: 'Rời giữa ván', text: 'Rời bàn hoặc mất kết nối giữa ván được xử thua. Nếu hệ thống huỷ ván thì không mất điểm.', badge: 'Chơi xong rồi hãy rời bàn' },
    ],
  },
];
