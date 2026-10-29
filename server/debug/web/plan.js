// Tính thời lượng sự kiện từ mô tả `length` của chính sự kiện (xem `debug` trong server/game/dogEvent.js): tổng `times × giá trị` của các thông số,
// cộng phần đứng hình đọc luật. Nhờ vậy thêm sự kiện mới không phải sửa file này. Đơn vị: giây.

export function eventSeconds(info, o) {
  const values = o.settings[info.id] ?? {};
  return o.intro + info.length.reduce((sum, { key, times }) => sum + times * (values[key] ?? 0), 0);
}

// Từ lúc bắt đầu trận tới khi sự kiện cuối xong (`total`), và độ dài trận nên đặt (`needed`: cộng thêm đoạn đệm cuối trận của server).
export function planSeconds(o, events, gap, tail) {
  const lengths = o.events.map((id) => eventSeconds(events.find((e) => e.id === id), o));
  const total = o.first + lengths.reduce((sum, n) => sum + n, 0) + gap * Math.max(0, lengths.length - 1);
  return { total, needed: Math.max(30, Math.ceil(total + tail) + 5) };
}

// Số người tối thiểu để mọi sự kiện đã chọn chạy được.
export const playersNeeded = (o, events) => Math.max(1, ...o.events.map((id) => events.find((e) => e.id === id).minPlayers));
