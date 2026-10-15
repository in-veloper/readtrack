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
  return <Image source={LINEN} resizeMode="repeat" style={StyleSheet.absoluteFill} />;
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

// 펼친 책 한쪽 면. 바깥쪽으로 페이지가 쌓인 두께(stack)가 보인다.
// side: 'left' | 'right'. 그림은 오른쪽 기준으로 그리고 왼쪽은 좌우 반전한다.
export function PageBlock({ book, side, width, height, stack, children }) {
  const xh = 2;
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
        d={pageShape(xh, topOuter + off, yt + off * 0.12, topBottom + off * 0.6, 5)}
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
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.board,
          { backgroundColor: book.color },
          side === 'right'
            ? { borderTopLeftRadius: 1, borderBottomLeftRadius: 1 }
            : { borderTopRightRadius: 1, borderBottomRightRadius: 1 },
        ]}
      />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={`paper${side}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#D2C4A8" />
            <Stop offset="0.07" stopColor="#EAE1CF" />
            <Stop offset="0.22" stopColor="#F7F2E8" />
            <Stop offset="0.85" stopColor="#F9F5EC" />
            <Stop offset="1" stopColor="#F2EBDD" />
          </SvgGradient>
        </Defs>
        <G transform={side === 'left' ? `translate(${width},0) scale(-1,1)` : undefined}>
          {layers}
          <Path d={pageShape(xh, topOuter, yt, topBottom, 5)} fill={`url(#paper${side})`} />
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
  board: {
    borderRadius: COVER_R,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
});
