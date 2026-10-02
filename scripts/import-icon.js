// 원본 아이콘(흰 둥근 타일 + 책 + READTRACK)에서 타일 테두리/그림자는 버리고
// 타일 안쪽 내용만 잘라 안드로이드 적응형 아이콘 안전영역(지름 66/108) 안에 들어가게 배치한다.
// 사용: node scripts/import-icon.js <원본 이미지 경로>
const path = require('path');
const sharp = require('C:/ClaudeCode_Project/studyplan/node_modules/sharp');

const SRC = process.argv[2];
const ASSETS = path.join(__dirname, '..', 'assets');

// 원본 기준 좌표(1254x1254). 내용 범위는 x 336~920, y 331~876, 타일 안쪽 흰 면 안에서
// 내용 둘레로 46px 여유를 둔 영역을 자른다.
const CROP = { left: 290, top: 285, width: 676, height: 637 };
const CONTENT_RADIUS = 400; // 내용 중심에서 가장 먼 점(READTRACK 글자 끝)까지 거리
const FEATHER = 34;

async function loadCrop() {
  const { data, info } = await sharp(SRC)
    .extract(CROP)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function averageBorderColor({ data, width, height }) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x > 12 && x < width - 12 && y > 12 && y < height - 12) continue;
      const i = (y * width + x) * 3;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

// 잘라낸 사각형 가장자리를 부드럽게 투명으로 녹여, 단색 배경 위에 얹었을 때 경계선이 안 보이게 한다.
function featheredRgba({ data, width, height }) {
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.min(x, y, width - 1 - x, height - 1 - y);
      const t = Math.max(0, Math.min(1, d / FEATHER));
      const a = t * t * (3 - 2 * t);
      const i = (y * width + x) * 3;
      const o = (y * width + x) * 4;
      out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2];
      out[o + 3] = Math.round(a * 255);
    }
  }
  return out;
}

// 테마 아이콘(안드로이드 13+)용: 흰 바탕은 지우고 어두운 부분만 남긴 실루엣.
function monochromeRgba({ data, width, height }, paper) {
  const out = Buffer.alloc(width * height * 4);
  const base = (paper.r + paper.g + paper.b) / 3;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const d = Math.min(x, y, width - 1 - x, height - 1 - y);
      const edge = Math.max(0, Math.min(1, d / FEATHER));
      const a = Math.max(0, Math.min(1, (base - 12 - l) / 50)) * edge;
      const o = (y * width + x) * 4;
      out[o] = 255; out[o + 1] = 255; out[o + 2] = 255;
      out[o + 3] = Math.round(a * 255);
    }
  }
  return out;
}

async function place(rgba, crop, canvasSrcPx, size, background) {
  const scale = size / canvasSrcPx;
  const w = Math.round(crop.width * scale);
  const h = Math.round(crop.height * scale);
  const layer = await sharp(rgba, { raw: { width: crop.width, height: crop.height, channels: 4 } })
    .resize(w, h, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: layer, left: Math.round((size - w) / 2), top: Math.round((size - h) / 2) }])
    .png();
}

(async () => {
  const crop = await loadCrop();
  const paper = averageBorderColor(crop);
  const hex = '#' + [paper.r, paper.g, paper.b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  const clear = { r: 0, g: 0, b: 0, alpha: 0 };
  const solid = { ...paper, alpha: 1 };

  const color = featheredRgba(crop);
  const mono = monochromeRgba(crop, paper);

  // 적응형 아이콘 캔버스(108dp)에서 안전영역 반지름은 33dp.
  const adaptiveCanvas = Math.ceil((CONTENT_RADIUS * 108) / 33) + 40;

  await (await place(color, crop, adaptiveCanvas, 1024, clear)).toFile(path.join(ASSETS, 'android-icon-foreground.png'));
  await (await place(mono, crop, adaptiveCanvas, 1024, clear)).toFile(path.join(ASSETS, 'android-icon-monochrome.png'));
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: solid } })
    .png()
    .toFile(path.join(ASSETS, 'android-icon-background.png'));

  // 일반 아이콘(iOS/웹 등)은 원본 타일 크기(약 880px)를 꽉 채우는 비율로.
  await (await place(color, crop, 880, 1024, solid)).toFile(path.join(ASSETS, 'icon.png'));
  await (await place(color, crop, 1000, 640, clear)).toFile(path.join(ASSETS, 'splash-icon.png'));
  await (await place(color, crop, 880, 196, solid)).toFile(path.join(ASSETS, 'favicon.png'));

  console.log('paper color', hex, 'adaptive canvas', adaptiveCanvas);
})();
