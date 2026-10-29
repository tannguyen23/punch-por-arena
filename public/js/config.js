export const PUNCH_TIME = 0.25;
export const PUNCH_COOLDOWN = 0.35;
export const MOVE_SPEED = 6;
export const EYE_HEIGHT = 1.7;
export const CROUCH_EYE_HEIGHT = 1.15;
export const SPRINT_MULT = 1.6;
export const CROUCH_MULT = 0.5;
export const JUMP_SPEED = 6.5;
export const GRAVITY = 20;
export const JUMP_AIR_TIME = (2 * JUMP_SPEED) / GRAVITY; // thời gian bay của một cú nhảy trên đất bằng (giây)
export const AIRBORNE_HEIGHT = 0.3; // cao hơn mặt đất ngần này (mét) thì người chơi khác được coi là đang nhảy
export const BASE_FOV = 1.1;
export const FOV_MIN = 0.7; // giới hạn thanh chỉnh FOV trong Cài đặt (radian)
export const FOV_MAX = 1.5;
export const MIN_DIST = 1.0; // khoảng cách tối thiểu giữa hai người chơi, khớp với server
export const PLAYER_RADIUS = 0.5;
export const WATER_SPEED_MULT = 0.55; // lội nước chậm hơn đi cạn
export const GROUND_STICK = 0.25; // đi xuống dốc, cách đất dưới ngần này thì vẫn bám đất (không rơi)
export const HOTBAR_SLOTS = 3; // số ô vũ khí trên thanh dưới màn hình

export const MOUSE_SENSITIVITY = 0.0022;
export const SENSITIVITY_MIN = 0.0005; // radian/pixel, giới hạn thanh chỉnh độ nhạy chuột
export const SENSITIVITY_MAX = 0.006;
export const STATE_SEND_MS = 50;

// Nhân vật dựng từ model .glb. "kinds" gán tên khối trong file → bộ phận để tô màu theo lựa chọn của người chơi
// (khối đặt tên theo tiền tố shirt_/pants_/glove_/skin_/hair_ thì khỏi cần ghi vào đây). Khối không có trong bảng giữ màu trắng.
export const CHARACTER = {
  url: '/models/char.glb',
  height: 2.0, // co giãn model về chiều cao này (mét), chân chạm đất
  facing: 0, // xoay model quanh trục Y (rad) cho mặt hướng +Z như nhân vật dựng bằng code
  idleSpeed: 1, // tốc độ vòng lặp idle (1 = đúng như file; giảm số này để chậm hơn)
  patternMeshes: ['body'], // khối áo mang hoạ tiết (tay áo chỉ có màu trơn)
  offHandMesh: 'right_hand', // khối găng tay trái (tên trái/phải trong file đang đặt ngược, như bên dưới)
  eyeMeshes: ['left_eye', 'right_eye'], // điểm giữa hai mắt = chỗ đặt camera khi dựng tay góc nhìn thứ nhất
  handMesh: 'left_hand', // khối găng nơi cầm kiếm. Trong file này tên trái/phải đang đặt ngược, 'left_hand' mới là tay phải của nhân vật
  kinds: {
    body: 'shirt', left_shoulder: 'shirt', right_shoulder: 'shirt', left_bicepts: 'shirt', right_bicepts: 'shirt',
    belt: 'glove', left_hand: 'glove', right_hand: 'glove',
    head: 'skin', neck: 'skin', left_elbow: 'skin', right_elbow: 'skin', left_foream: 'skin', right_foream: 'skin',
    cylinder: 'pants',
    beveled_cuboid: 'shoe', left_eye: 'eye', right_eye: 'eye', left_pupil: 'pupil', right_pupil: 'pupil',
    mouth: 'mouth',
  },
  // Khối không có tên riêng (vd: 23 khối `cube` của tóc) được nhận theo tên nhóm cha.
  groupKinds: { hair: 'hair' },
  fixedColors: { shoe: '#1b1b22', eye: '#ffffff', pupil: '#14141a', mouth: '#8c2626' },
};

// Tay của mình ở góc nhìn thứ nhất: dùng chính nhân vật model (cùng hoạt ảnh đấm, thế thủ, cùng cách cầm vũ khí) nhưng chỉ hiện
// cẳng tay + bàn tay, gắn vào camera và vẽ đè lên mọi thứ (không xuyên tường). Model vẽ cho người nhìn từ ngoài: ở thế thủ hai bàn tay
// cách mắt ±0.7m và thấp 0.85m (ngoài tầm nhìn) nên phải co nhỏ rồi đẩy lên trước mặt. Đặt `enabled: false` để quay về hai nắm đấm hình cầu.
export const VIEWMODEL = {
  enabled: true,
  scale: 0.65, // co tay lại cho vừa tầm nhìn
  offset: { x: 0, y: 0.25, z: 0.6 }, // vị trí của MẮT model trong hệ camera (sau khi co); tăng y để tay lên cao, tăng z để tay ra xa
  renderingGroup: 1, // nhóm vẽ đè sau cùng (xoá bộ đệm độ sâu trước khi vẽ)
  meshes: ['left_foream', 'right_foream', 'left_hand', 'right_hand'], // chỉ các khối này hiện, còn lại (vai, thân, đầu, tóc...) ẩn
};

// Khung xem trước nhân vật trong menu.
export const PREVIEW = {
  cameraAlpha: Math.PI / 2 - 0.45, // nhìn chếch 3/4 mặt trước
  cameraBeta: 1.32,
  cameraRadius: 3,
  targetY: 1,
  fov: 0.8,
  rotateSpeed: 0.6,
};
