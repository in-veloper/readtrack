import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import Svg, { Circle, Path, LinearGradient as SvgGradient, Stop, Defs, G } from 'react-native-svg';

import { colors, font, textOn } from './theme';
import { spineVariant } from './geometry';
import { progressRatio } from './store';

const TAB_TUCK = 6; // 포스트잇이 표지 안쪽으로 들어가 있는 길이

// 책 모서리 둥글기(실물 크기 기준). 책등은 책장에서 0.55~0.75 배로 줄어 보인다.
const SPINE_R = 4;
const COVER_R = 5;

// 하드커버 천(린넨) 결 — 색 없이 밝고 어두운 결만 담긴 타일이라 어떤 표지 색 위에도 얹힌다(scripts/make-texture.js).
const LINEN = require('../assets/textures/linen.png');
function Cloth() {
  // 작은 타일 반복은 안드로이드에서 안 먹혀서, 표지만 한 큰 질감 한 장을 꽉 채워(cover) 덮는다.
  // 책등처럼 좁은 면은 가운데만 잘려 쓰이고, 높이가 표지와 같아 결의 굵기도 같다.
  return <Image source={LINEN} resizeMode="cover" style={StyleSheet.absoluteFill} />;
}

// 읽은 비율을 보여주는 얇은 원형 링
export function ProgressRing({ size, stroke, ratio, color, track }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {ratio > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </Svg>
  );
}

// 책등 — 실물 크기(width=두께, height=BOOK_H)로 그린다.
// 3D 회전되는 뷰 안에서 쓰이므로 overflow:hidden(둥근 클리핑)은 쓰지 않는다(안드로이드에서 통째로 안 그려짐).
// joined: 손에 든 책처럼 앞표지와 붙어 보일 때 — 경첩 쪽이라 모서리를 둥글리지 않는다.
// 책장에 꽂힌 책등만 실제 책처럼 살짝 둥글게 한다.
export function SpineFace({ book, width, height, joined }) {
  const variant = spineVariant(book);
  const fg = textOn(book.color);
  const ratio = progressRatio(book);
  const ringSize = Math.min(22, width * 0.56);
  const ringZone = ringSize + 34;
  const titleTop = 22;
  const titleLen = height - titleTop - ringZone - 10;
  const fontSize = Math.min(19, width * 0.42);

  return (
    <View style={[styles.spine, { width, height, backgroundColor: book.color, borderRadius: joined ? 2 : SPINE_R }]}>
      <Cloth />
      {variant === 2 && (
        <View style={[styles.twoTone, { height: height * 0.3 }]} />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.16)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.18)']}
        locations={[0, 0.22, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {variant === 1 && (
        <>
          <View style={[styles.hairline, { top: 12, backgroundColor: fg }]} />
          <View style={[styles.hairline, { bottom: 12, backgroundColor: fg }]} />
        </>
      )}

      <View
        style={[
          styles.spineTitleBox,
          {
            width: titleLen,
            height: width,
            left: width / 2 - titleLen / 2,
            top: titleTop + titleLen / 2 - width / 2,
          },
        ]}
      >
        <Text numberOfLines={1} style={[styles.spineTitle, { fontSize, color: fg }]}>
          {book.title}
        </Text>
      </View>

      <View style={[styles.ringWrap, { bottom: 24, height: ringSize }]}>
        <ProgressRing
          size={ringSize}
          stroke={2}
          ratio={ratio}
          color={fg}
          track={fg === '#FFFFFF' ? 'rgba(255,255,255,0.25)' : 'rgba(27,35,51,0.18)'}
        />
      </View>
    </View>
  );
}

// 앞표지 — 실물 크기(PAGE_W x BOOK_H). 읽던 쪽에 붙인 포스트잇이 책 옆으로 살짝 삐져나온다.
export function CoverFace({ book, width, height, tabStyle }) {
  const fg = textOn(book.color);
  const dim = fg === '#FFFFFF' ? 'rgba(255,255,255,0.62)' : 'rgba(27,35,51,0.55)';
  const track = fg === '#FFFFFF' ? 'rgba(255,255,255,0.18)' : 'rgba(27,35,51,0.14)';
  const ratio = progressRatio(book);
  const ring = Math.round(width * 0.46);

  return (
    <View style={{ width, height }}>
      {book.currentPage > 0 && (
        <Animated.View style={[styles.tab, { top: height * 0.14, left: width - TAB_TUCK }, tabStyle]}>
          <Text style={styles.tabText}>p.{book.currentPage}</Text>
          <LinearGradient
            colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tabTuckShade}
          />
        </Animated.View>
      )}
      <View style={[styles.cover, { backgroundColor: book.color }]}>
        <Cloth />
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.16)', 'rgba(255,255,255,0.12)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.crease}
        />

        <Text style={[styles.coverMeta, { color: dim }]}>{book.totalPages} PAGES</Text>

        <View style={[styles.ringArea, { top: height * 0.2, width: ring, height: ring, left: (width - ring) / 2 + 4 }]}>
          <ProgressRing size={ring} stroke={2.5} ratio={ratio} color={fg} track={track} />
          <View style={styles.ringLabel}>
            <Text style={[styles.ringPct, { color: fg }]}>
              {Math.round(ratio * 100)}
              <Text style={styles.ringPctSign}>%</Text>
            </Text>
          </View>
        </View>

        <View style={styles.coverBottom}>
          <View style={[styles.coverRule, { backgroundColor: fg }]} />
          <Text numberOfLines={3} style={[styles.coverTitle, { color: fg }]}>
            {book.title}
          </Text>
        </View>
      </View>
    </View>
  );
}

function pageShape(xh, xo, yt, yb, curve) {
  const cx = xh + (xo - xh) * 0.35;
  return `M${xh} ${yt + curve} Q${cx} ${yt - 1} ${xo} ${yt} L${xo} ${yb} Q${cx} ${yb + 1} ${xh} ${yb - curve} Z`;
}

// 하드커버 안쪽 바깥 모서리의 대각선 접힘 자국. 겉표지 천을 판지 안쪽으로 접어 넘길 때
// 모서리를 45도로 겹쳐 접어서 생기는 선이다. 어두운 접힘선 옆에 밝은 선을 나란히 그어 천이 겹친 턱을 낸다.
// 책등과 붙는 경첩 쪽 모서리에는 없다.
function CornerMiters({ side, width, height }) {
  const L = 18;
  const x = side === 'right' ? width : 0;
  const dx = side === 'right' ? -1 : 1;
  const corners = [
    { x, y: 0, dy: 1 },
    { x, y: height, dy: -1 },
  ];
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      {corners.map((c, i) => {
        const x1 = c.x + dx * 1.2;
        const y1 = c.y + c.dy * 1.2;
        const x2 = c.x + dx * L;
        const y2 = c.y + c.dy * L;
        // 접힘선에 수직인 방향으로 1px 옆에 밝은 선
        const ox = c.dy * 0.9;
        const oy = -dx * 0.9;
        return (
          <G key={i}>
            <Path d={`M${x1} ${y1} L${x2} ${y2}`} stroke="#000" strokeOpacity={0.3} strokeWidth={1.1} strokeLinecap="round" />
            <Path d={`M${x1 + ox} ${y1 + oy} L${x2 + ox} ${y2 + oy}`} stroke="#fff" strokeOpacity={0.2} strokeWidth={0.8} strokeLinecap="round" />
          </G>
        );
      })}
    </Svg>
  );
}

// 펼친 책 한쪽 면. 바깥쪽으로 페이지가 쌓인 두께(stack)가 보인다.
// side: 'left' | 'right'. 그림은 오른쪽 기준으로 그리고 왼쪽은 좌우 반전한다.
export function PageBlock({ book, side, width, height, stack, children }) {
  // 종이를 경첩(책 가운데)까지 붙인다 — 예전엔 2px 떨어져 있어서 두 쪽 사이로 표지 색이 비쳐 벌어져 보였다.
  const xh = 0;
  const xo = width - 6;
  const yt = 6;
  const yb = height - 6;
  const topOuter = xo - stack;
  const topBottom = yb - stack * 0.6;
  const n = Math.max(2, Math.round(stack / 1.3));

  const layers = [];
  for (let i = n; i >= 1; i--) {
    const off = (i / n) * stack;
    layers.push(
      <Path
        key={i}
        d={pageShape(xh, topOuter + off, yt + off * 0.12, topBottom + off * 0.6, 2.5)}
        fill={i % 2 ? '#F1EADC' : '#E6DCC9'}
        stroke={colors.paperEdge}
        strokeWidth={0.4}
      />
    );
  }

  const contentLeft = side === 'right' ? xh + 14 : width - topOuter + 10;
  const contentWidth = topOuter - xh - 26;

  return (
    <View style={{ width, height }}>
      {/* 표지 안쪽(판지). 실제 하드커버는 겉표지 천이 판지 가장자리를 감싸 안쪽으로 접혀
          들어와 있어서, 종이 둘레로 보이는 테두리에도 같은 천 결이 보인다. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.board,
          { backgroundColor: book.color },
          side === 'right'
            ? { borderTopLeftRadius: 1, borderBottomLeftRadius: 1 }
            : { borderTopRightRadius: 1, borderBottomRightRadius: 1 },
        ]}
      >
        <View style={[StyleSheet.absoluteFill, styles.boardClip, side === 'right' ? styles.boardClipRight : styles.boardClipLeft]}>
          <Cloth />
          {/* 판지 두께: 바깥 가장자리가 둥글게 말려 어두워지고, 그 안쪽에 천이 접힌 자리의 옅은 빛 */}
          <View
            style={[
              styles.boardEdge,
              side === 'right' ? { borderLeftWidth: 0, left: -2 } : { borderRightWidth: 0, right: -2 },
            ]}
          />
          <View
            style={[
              styles.boardTurnIn,
              side === 'right' ? { borderLeftWidth: 0, left: -2 } : { borderRightWidth: 0, right: -2 },
            ]}
          />
          <CornerMiters side={side} width={width} height={height} />
        </View>
      </View>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={`paper${side}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#E3D8C3" />
            <Stop offset="0.07" stopColor="#EFE7D7" />
            <Stop offset="0.22" stopColor="#F7F2E8" />
            <Stop offset="0.85" stopColor="#F9F5EC" />
            <Stop offset="1" stopColor="#F2EBDD" />
          </SvgGradient>
          {/* 가운데 접힌 곳(경첩) 쪽으로 종이가 말려 들어가며 어두워지는 그늘 */}
          <SvgGradient id={`gutter${side}`} x1="0" y1="0" x2="1" y2="0">
            {/* 진하게 짧게 끊기면 그어 놓은 선처럼 보인다 — 옅게 시작해 넓게, 천천히 사라지게 */}
            <Stop offset="0" stopColor="#3A2E1C" stopOpacity="0.16" />
            <Stop offset="0.03" stopColor="#3A2E1C" stopOpacity="0.11" />
            <Stop offset="0.08" stopColor="#3A2E1C" stopOpacity="0.06" />
            <Stop offset="0.15" stopColor="#3A2E1C" stopOpacity="0.025" />
            <Stop offset="0.26" stopColor="#3A2E1C" stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <G transform={side === 'left' ? `translate(${width},0) scale(-1,1)` : undefined}>
          {[7, 4.5, 2.5].map((w, k) => (
            <Path
              key={`shade${k}`}
              d={pageShape(xh, topOuter + stack + 0.8, yt + stack * 0.12 + 0.8, topBottom + stack * 0.6 + 1.2, 2.5)}
              fill="none"
              stroke="#000"
              strokeOpacity={0.05 + k * 0.03}
              strokeWidth={w}
              strokeLinejoin="round"
            />
          ))}
          {layers}
          <Path d={pageShape(xh, topOuter, yt, topBottom, 2.5)} fill={`url(#paper${side})`} />
          <Path d={pageShape(xh, topOuter, yt, topBottom, 2.5)} fill={`url(#gutter${side})`} />
        </G>
      </Svg>
      <View
        style={{
          position: 'absolute',
          left: contentLeft,
          width: contentWidth,
          top: yt + 16,
          bottom: height - topBottom + 10,
        }}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 실제 책처럼 모서리를 살짝 둥글게(책장에선 축소돼서 이 정도여야 각이 덜 져 보인다)
  spine: {
    overflow: 'hidden', // 둥근 모서리 밖으로 덧칠한 그라데이션·띠가 삐져나오지 않게
  },
  twoTone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  hairline: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    height: 1,
    opacity: 0.55,
  },
  spineTitleBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '90deg' }],
  },
  spineTitle: {
    fontFamily: font.semibold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  ringWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cover: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    // 바깥쪽(오른쪽) 모서리만 둥글게 — 왼쪽은 책등과 붙는 경첩이라 각지게 둔다
    borderTopRightRadius: COVER_R,
    borderBottomRightRadius: COVER_R,
    borderTopLeftRadius: 1,
    borderBottomLeftRadius: 1,
    overflow: 'hidden',
  },
  crease: {
    position: 'absolute',
    left: 7,
    top: 0,
    bottom: 0,
    width: 5,
  },
  coverMeta: {
    position: 'absolute',
    top: 20,
    left: 24,
    fontFamily: font.semibold,
    fontSize: 8.5,
    letterSpacing: 2.5,
  },
  ringArea: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    fontFamily: font.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  ringPctSign: {
    fontFamily: font.semibold,
    fontSize: 11,
  },
  coverBottom: {
    position: 'absolute',
    left: 24,
    right: 18,
    bottom: 26,
  },
  coverRule: {
    width: 18,
    height: 2,
    marginBottom: 10,
    opacity: 0.85,
  },
  coverTitle: {
    fontFamily: font.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  tab: {
    position: 'absolute',
    height: 20,
    paddingLeft: TAB_TUCK + 3,
    paddingRight: 5,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: colors.tab,
    justifyContent: 'center',
  },
  tabTuckShade: {
    position: 'absolute',
    left: TAB_TUCK,
    top: 0,
    bottom: 0,
    width: 4,
  },
  tabText: {
    fontFamily: font.bold,
    fontSize: 8.5,
    color: colors.tabText,
  },
  // 판지 안쪽 덧칠(천 결·가장자리)이 둥근 모서리 밖으로 안 나가게 자른다
  boardClip: { overflow: 'hidden', borderRadius: COVER_R },
  boardClipRight: { borderTopLeftRadius: 1, borderBottomLeftRadius: 1 },
  boardClipLeft: { borderTopRightRadius: 1, borderBottomRightRadius: 1 },
  boardEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: COVER_R,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.22)',
  },
  boardTurnIn: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 2,
    bottom: 2,
    borderRadius: COVER_R - 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  board: {
    borderRadius: COVER_R,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
});
