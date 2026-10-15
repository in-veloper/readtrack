// 하드커버 책 표지의 천(린넨) 결을 흉내 낸 질감 이미지를 만든다(assets/textures/linen@3x.png).
// 색은 없고 밝고 어두운 결만 투명도로 담아서, 어떤 표지 색 위에 얹어도 그 색의 천처럼 보인다.
// 사용: node scripts/make-texture.js
const path = require('path');
const sharp = require('C:/ClaudeCode_Project/studyplan/node_modules/sharp');

// 안드로이드에서 작은 타일 반복(resizeMode repeat)이 안 먹혀 구석에 한 조각만 그려졌다 —
// 표지 한 장 크기(실물 PAGE_W 200 x BOOK_H 284 를 3배 해상도로)의 큰 이미지 하나로 덮는다.
const W = 600;
const H = 852;
const PERIOD = 3; // 실 한 가닥 간격(px)

// 시드 고정 난수 — 다시 만들어도 같은 무늬가 나오게
let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

// 실마다 굵기·밝기가 조금씩 다른 "슬럽"을 준다(줄마다 고정값)
const rowSlub = Array.from({ length: H }, () => 0.6 + rand() * 0.8);
const colSlub = Array.from({ length: W }, () => 0.6 + rand() * 0.8);

const px = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const weft = Math.cos((2 * Math.PI * y) / PERIOD) * rowSlub[y];
    const warp = Math.cos((2 * Math.PI * x) / PERIOD) * colSlub[x];
    // 가로실·세로실이 번갈아 위로 올라오는 평직 느낌
    const over = (Math.floor(x / PERIOD) + Math.floor(y / PERIOD)) % 2 === 0 ? weft : warp;
    const v = over * 0.55 + (rand() - 0.5) * 0.9; // 결 + 잔 얼룩
    const i = (y * W + x) * 4;
    if (v >= 0) {
      px[i] = px[i + 1] = px[i + 2] = 255;
      px[i + 3] = Math.round(Math.min(1, v) * 34);
    } else {
      px[i] = px[i + 1] = px[i + 2] = 0;
      px[i + 3] = Math.round(Math.min(1, -v) * 46);
    }
  }
}

sharp(px, { raw: { width: W, height: H, channels: 4 } })
  .png()
  .toFile(path.join(__dirname, '..', 'assets', 'textures', 'linen@3x.png'))
  .then(() => console.log('linen@3x.png'));
