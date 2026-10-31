# Bot thử nghiệm

Bot là người chơi do server tự lái, dùng để thử game khi không có đủ người. Tài liệu này ghi lại **bot đang làm được gì** và **chưa làm được gì**. Bản mô tả kỹ thuật ngắn nằm trong mục "Bot thử nghiệm" của `CLAUDE.md`.

## Cách dùng

- Bấm "Tạo phòng mới" ở menu chính: màn tạo phòng hiện ra. Chọn những map sẽ xoay vòng, bật "Thêm bot", chọn số bot (1–7, bật thì mặc định 3) và mức **1 Dễ / 2 Thường / 3 Khó**, rồi bấm "Tạo phòng".
- **Không còn tham số URL `bot_count` / `bot_level`.** Số bot và mức chọn ngay trong màn tạo phòng.
- Chỉ áp dụng lúc **tạo** phòng. Vào phòng có sẵn thì không thêm bot.
- Số bot tối đa là số chỗ trống sau khi người tạo vào (phòng 8 người thì tối đa 7 bot).
- Chế độ test `--single-room` (mọi tab dùng chung một phòng) không thêm bot.

## Mức bot

| | 1 – Dễ | 2 – Trung bình (mặc định) | 3 – Khó |
|---|---|---|---|
| Nhịp phản ứng | 250ms | 100ms | 50ms |
| Tốc độ đi | 0.65× | 0.85× | 1× |
| Tầm thấy vật nhặt | 7m | 18m | 35m |
| Ưu tiên nhặt đồ (gần hơn người không quá) | 1m | 4m | 10m |
| Tầm thấy thuốc | 4m | 12m | 35m |
| Nghỉ giữa hai đòn | 900ms | 400ms | 0ms |
| Lệch khi bắn | 0.05 rad | 0.02 rad | 0.005 rad |
| Bỏ đòn | 35% | 12% | 0% |
| Sát thương gây ra | 0.6× | 0.8× | 1× |

Mức chỉ áp dụng cho bot trong phòng lúc tạo; mọi bot trong phòng cùng một mức.

## Bot làm được

**Là người chơi thật trong phòng**
- Có tên `Bot 1`, `Bot 2`..., ngoại hình ngẫu nhiên, luôn ở trạng thái sẵn sàng.
- Xuất hiện trong danh sách người chơi (phím Tab), bảng điểm, bảng xếp hạng, có máu, hồi sinh, rơi vũ khí khi chết như người thật.
- Chủ phòng kick được bot như kick người thường.
- Bot không bao giờ là chủ phòng. Chủ phòng thoát thì quyền chuyển sang người thật còn lại.
- Người thật cuối cùng rời phòng thì bot đi theo và phòng được xoá.

**Di chuyển**
- Đi bộ với tốc độ 6 m/giây (`BOT.speed`), nhân theo mức bot (`0.65×` / `0.85×` / `1×`).
- Gặp tường hoặc vật cản (cây, bàn ghế, thùng...) thì rẽ sang một bên rồi tiếp tục, ưu tiên rẽ cùng phía lần trước nên không lắc qua lại.
- Không đi vào hư không giữa các đảo (map sky-islands).
- Đứng yên ngoài trận (phòng chờ, đếm ngược, hết trận), chỉ hoạt động khi đang `playing`.

**Chọn mục tiêu**
- Đuổi người sống gần nhất (kể cả người thật và bot khác).
- Không đánh đồng đội trong sự kiện solo đấu đội.
- Đi nhặt hòm tiếp tế, vũ khí rơi và lọ thuốc đã chạm đất theo tầm / độ ưu tiên của mức bot (mức 1 chỉ thấy trong 7m và rất ít khi bỏ người chơi để đi nhặt; mức 3 là 35m / 10m như cũ). Túi đầy thì chỉ nhặt thuốc; mức 1 chỉ nhặt thuốc khi ở trong 4m. Chỉ tự cầm món mới khi đang tay không; đang cầm vũ khí thì món nhặt được chỉ vào túi.

**Chiến đấu** (dùng vũ khí đang cầm, theo đúng luật và hồi chiêu của game)
- Cận chiến: lại gần rồi đánh khi mục tiêu trong tầm của vũ khí; tay không đấm luân phiên trái/phải, cầm vũ khí thì đánh bằng tay phải.
- Súng (súng lục, AK-47): bắn khi mục tiêu trong 45m, đứng cách khoảng 12m, ngắm vào ngực.
- Súng phóng tên lửa: bắn khi mục tiêu cách 10–60m.
- Lựu đạn (nổ, choáng, băng): ném khi mục tiêu cách 6–22m.
- Tự thay băng khi hết đạn trong băng nhưng còn đạn dự trữ.
- Vũ khí hết đạn hoặc gãy tự hỏng, biến mất và về tay không (ô túi tự trống).
- Cất radio gọi bom (bot không biết dùng) để cầm vũ khí khác.

**Mức bot ảnh hưởng tới chiến đấu:** nhịp phản ứng, tốc độ, độ lệch khi bắn / xoay người, tỉ lệ bỏ đòn, thời gian nghỉ giữa hai đòn và sát thương gây ra. Mức 1 bắn lệch nhiều, bỏ 35% số đòn, nghỉ 900ms giữa hai đòn và chỉ gây 0.6× sát thương; mức 3 gần như bot cũ (bắn rất chính xác, không bỏ đòn, sát thương 1×).

**Mọi hành động đi qua cùng các hàm xử lý tin nhắn của người chơi thật** (`applyClientState`, `handlePunch`, `handleFire`, `handleThrow`...). Nhờ vậy sát thương, hồi chiêu, nhặt đồ, hồi sinh, điểm và hạ gục đều giống người thật; riêng sát thương bot gây ra bị nhân thêm `damageMult` của mức bot (`damage.js`).

## Bot chưa làm được

**Di chuyển**
- Chạy nước rút (Shift), nhảy, ngồi.
- Đi vòng xa quanh vật cản lớn: bot chỉ rẽ sát vật cản nên có thể bị kẹt ở chỗ lõm lớn (chưa có tìm đường).
- Tránh nước (lội sông vẫn đi bình thường) và các vùng nguy hiểm (sét báo trước, vùng bom hạt nhân). Xương rồng thì bot luôn đi vòng vì nó là vật cản có kích thước.

**Chiến đấu**
- Né đạn, né đòn, bỏ chạy khi máu thấp.
- Chọn vũ khí tốt nhất: bot chỉ tự cầm món mới khi đang tay không; đang cầm vũ khí thì món nhặt được chỉ vào túi và bot không đổi ô theo tình huống.
- Dự đoán đường đi của mục tiêu: súng ngắm thẳng vào vị trí hiện tại.

**Skill và vật phẩm đặc biệt**
- Ném vũ khí bằng skill (kiếm, dao găm), đấm trời giáng của người hoá to, gọi radio khi hạ gục liên tiếp, thả shit khi hoá chó.
- Dùng bom hạt nhân (chỉ cất đi).

**Sự kiện và trò chơi khác**
- Hoá chó: bot làm chó vẫn đi theo logic thường, không chạy trốn.
- Solo đấu đội: bot không cược; bot võ sĩ đánh theo logic thường, bot khán giả không ném dao hay cà chua.
- Chuyền TNT: bot cầm TNT đuổi và đấm người gần nhất (đúng cách chuyền), nhưng không tính toán gì thêm.
- Cờ ca-rô 3×3 ở bàn.

**Khác**
- Bot không nói chuyện, không có biểu cảm hay ảnh mặt.
- Bot không tự rời phòng hay vào lại phòng.

## Cần biết khi dùng

- Vì bot luôn sẵn sàng, phòng có nhiều bot sẽ tự đếm ngược ngay khi người tạo vào (hơn một nửa số người đã sẵn sàng là đủ).
- Phòng có bot tính vào số người tối đa của phòng, nên người khác sẽ thấy "Phòng đã đầy" nếu bot lấp hết chỗ.
- Bot hoạt động giống người thật nên phòng có nhiều bot làm các hiệu ứng, thời tiết và hòm tiếp tế chạy nhiều hơn, rất hợp để đo hiệu năng (bảng F3).

## Cấu hình

Mọi thông số nằm trong `BOT` ở `server/config.js`:

| Tham số | Ý nghĩa | Giá trị hiện tại |
|---|---|---|
| `tickMs` | Chu kỳ suy nghĩ (ms) | 50 |
| `speed` | Tốc độ đi (m/giây) | 6 |
| `pickupRange` | Tầm thấy vật nhặt (m) | 35 |
| `pickupBias` | Đi nhặt đồ nếu gần hơn người gần nhất không quá ngần này (m) | 10 |
| `keepAway` | Khoảng cách đứng với vũ khí tầm xa (m) | 12 |
| `meleeSlack` | Dư tầm đánh cận chiến (m) | 0.3 |
| `gunRange` | Tầm bắn của súng (m) | 45 |
| `rocketRange` | Tầm bắn tên lửa (m) | 10–60 |
| `grenadeRange` | Tầm ném lựu đạn (m) | 6–22 |
| `grenadePitch` | Góc ném lựu đạn (radian) | 0.2 |
| `aimHeight` | Độ cao ngắm so với chân (m) | 0.9 |
| `sidestepAngles` | Các góc rẽ khi gặp vật cản (radian) | 0.6, 1.2, 1.8, 2.4 |

Mức bot nằm trong `BOT_LEVELS` (1/2/3) và `DEFAULT_BOT_LEVEL` (2) cùng file `server/config.js`; các tham số nền ở trên vẫn dùng chung cho mọi mức.

## Mã nguồn và kiểm tra

- `server/game/botRoster.js`: thêm / bớt bot, kết nối giả, gán `p.botLevel`.
- `server/game/botBrain.js`: bộ não (chọn mục tiêu, di chuyển, tấn công, áp mức bot).
- `server/game/botLoop.js`: vòng lặp suy nghĩ cho mọi bot trong mọi phòng.
- `server/game/sanitize.js`: `sanitizeBotCount` / `sanitizeBotLevel` kiểm tra tham số xin từ URL.
- `server/game/damage.js`: nhân sát thương bot gây ra theo mức.
- Kiểm tra: `node --test scripts/test-bots.js`.
