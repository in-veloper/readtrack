export const colors = {
  wallTop: '#F3EEE7',
  wallBottom: '#E9E2D8',
  oakTop: '#EAD5B3',
  oakFace: '#D4B184',
  oakFaceDark: '#C29C69',
  navy: '#1B2333',
  inkSoft: '#6B7080',
  paper: '#F6F1E7',
  paperEdge: '#D3C7B1',
  ink: '#22201C',
  tab: '#F2D46B',
  tabText: '#5C4A12',
  scrim: 'rgba(20, 24, 33, 0.62)',
  card: '#FFFDF9',
  field: '#F2EFEA',
};

export const font = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
};

// 매트한 모던 컬러
export const SPINE_COLORS = [
  '#1F2A44', '#C0654A', '#8FA391', '#D9A441', '#6E8CAB',
  '#2F2F33', '#D6A49C', '#6B7247', '#E9E0CF', '#2F4A3F',
];

export function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 165;
}

export function textOn(hex) {
  return isLight(hex) ? colors.navy : '#FFFFFF';
}
