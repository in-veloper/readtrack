// 하드커버 책 표지의 천(린넨) 결을 흉내 낸 반복 무늬 타일을 만든다(assets/textures/linen.png).
// 색은 없고 밝고 어두운 결만 투명도로 담아서, 어떤 표지 색 위에 얹어도 그 색의 천처럼 보인다.
// 사용: node scripts/make-texture.js
const path = require('path');
const sharp = require('C:/ClaudeCode_Project/studyplan/node_modules/sharp');

const SIZE = 96; // 이 크기로 바둑판처럼 반복된다(가로세로 주기가 딱 나눠떨어져야 이음매가 안 보인다)
const PERIOD = 3; // 실 한 가닥 간격(px)

// 시드 고정 난수 — 다시 만들어도 같은 무늬가 나오게
let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

// 실마다 굵기·밝기가 조금씩 다른 "슬럽"을 준다(줄마다 고정값)
const rowSlub = Array.from({ length: SIZE }, () => 0.6 + rand() * 0.8);
const colSlub = Array.from({ length: SIZE }, () => 0.6 + rand() * 0.8);

const px = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const weft = Math.cos((2 * Math.PI * y) / PERIOD) * rowSlub[y];
    const warp = Math.cos((2 * Math.PI * x) / PERIOD) * colSlub[x];
    // 가로실·세로실이 번갈아 위로 올라오는 평직 느낌
    const over = (Math.floor(x / PERIOD) + Math.floor(y / PERIOD)) % 2 === 0 ? weft : warp;
    const v = over * 0.55 + (rand() - 0.5) * 0.9; // 결 + 잔 얼룩
    const i = (y * SIZE + x) * 4;
    if (v >= 0) {
      px[i] = px[i + 1] = px[i + 2] = 255;
      px[i + 3] = Math.round(Math.min(1, v) * 34);
    } else {
      px[i] = px[i + 1] = px[i + 2] = 0;
      px[i + 3] = Math.round(Math.min(1, -v) * 46);
    }
  }
}

sharp(px, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .png()
  .toFile(path.join(__dirname, '..', 'assets', 'textures', 'linen.png'))
  .then(() => console.log('linen.png'));
