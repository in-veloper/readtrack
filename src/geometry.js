import { Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

export const SCREEN = { w: SW, h: SH };

// 모든 책은 같은 "실물 크기"(PAGE_W x BOOK_H)로 그리고, 책장/손에 든 상태는 scale 로만 크기를 바꾼다.
// 그래야 책장의 책등과 꺼낸 책이 픽셀 단위로 같은 그림이 된다.
export const PAGE_W = Math.floor(Math.min((SW - 28) / 2, 200));
export const BOOK_H = Math.round(PAGE_W * 1.42);
export const CLOSED_SCALE = Math.min(1.32, (SW * 0.6) / PAGE_W);

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function shelfSize(book) {
  const h = 148 + (hash(book.id) % 5) * 11;
  const t = Math.round(Math.max(24, Math.min(56, 20 + book.totalPages / 22)));
  return { h, t };
}

export function baseThickness(book) {
  const { h, t } = shelfSize(book);
  return (t * BOOK_H) / h;
}

export function spineVariant(book) {
  return hash(`${book.id}v`) % 3;
}
