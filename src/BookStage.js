import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, BackHandler, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Ellipse, Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { SpineFace, CoverFace, PageBlock } from './faces';
import { SCREEN, PAGE_W, BOOK_H, CLOSED_SCALE, baseThickness } from './geometry';
import { colors, font } from './theme';
import { progressRatio } from './store';

const M = 40;
const CW = 2 * (PAGE_W + M);
const CH = BOOK_H + 2 * M;
const HINGE = CW / 2;

const CLOSED_TILT = 75; // 표지가 거의 정면이지만 책등이 살짝 보이는 각도
const PERSPECTIVE = 900;

const IN_MS = 680;
const OPEN_MS = 1000;
const CLOSE_MS = 650;
const BACK_MS = 560;
const FOLD_DRAG = 240; // 펼친 책을 이만큼 위로 끌면 완전히 덮힘

const CLAMP = Extrapolation.CLAMP;

export default function BookStage({ book, origin, onClosed, onSave }) {
  const tb = baseThickness(book);

  const geo = useMemo(() => {
    const cx = SCREEN.w / 2;
    const cos = Math.cos((CLOSED_TILT * Math.PI) / 180);
    const sin = Math.sin((CLOSED_TILT * Math.PI) / 180);
    const kc = CLOSED_SCALE;
    return {
      x0: origin.x + origin.width,
      y0: origin.y + origin.height / 2,
      k0: origin.height / BOOK_H,
      xc: cx - ((PAGE_W * sin - tb * cos) * kc) / 2,
      yc: SCREEN.h * 0.46,
      kc,
      xo: cx,
      yo: SCREEN.h * 0.4,
    };
  }, []);

  const p = useSharedValue(0); // 0 책장 ~ 1 손에 듦
  const o = useSharedValue(0); // 0 덮힘 ~ 1 펼침
  const drag = useSharedValue(0);

  const [phase, setPhase] = useState('in'); // in | closed | opening | open | out
  const [pageText, setPageText] = useState(String(book.currentPage));

  useEffect(() => {
    p.value = withTiming(1, { duration: IN_MS, easing: Easing.bezier(0.22, 0.9, 0.25, 1) }, (done) => {
      if (done) runOnJS(setPhase)('closed');
    });
  }, []);

  const commit = useCallback(() => {
    const n = parseInt(pageText, 10);
    const v = Number.isFinite(n) ? Math.max(0, Math.min(n, book.totalPages)) : book.currentPage;
    setPageText(String(v));
    if (v !== book.currentPage) onSave(book.id, v);
  }, [pageText, book]);

  const openBook = () => {
    if (phase !== 'closed') return;
    setPhase('opening');
    o.value = withTiming(1, { duration: OPEN_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
      if (done) runOnJS(setPhase)('open');
    });
  };

  const flyBack = () => {
    drag.value = withTiming(0, { duration: BACK_MS, easing: Easing.inOut(Easing.cubic) });
    p.value = withTiming(0, { duration: BACK_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
      if (done) runOnJS(onClosed)();
    });
  };

  // 지금 펼쳐진 정도(o)에서 이어서 덮고, 다 덮이면 책장으로 돌아간다.
  const shelve = useCallback(() => {
    if (phase !== 'closed' && phase !== 'open') return;
    Keyboard.dismiss();
    commit();
    setPhase('out');
    if (o.value > 0.001) {
      o.value = withTiming(0, { duration: Math.max(250, CLOSE_MS * o.value), easing: Easing.out(Easing.cubic) }, (done) => {
        if (done) runOnJS(flyBack)();
      });
    } else {
      flyBack();
    }
  }, [phase, commit]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      shelve();
      return true;
    });
    return () => sub.remove();
  }, [shelve]);

  // 덮힌 책: 손가락 따라 위로 들리다가 놓으면 책장으로.
  // 펼친 책: 위로 끄는 만큼 책이 접히고, 놓으면 마저 접혀서 책장으로(덜 끌었으면 다시 펼쳐짐).
  const pan = useMemo(() => {
    const isOpen = phase === 'open';
    const hideKeyboard = () => Keyboard.dismiss();
    return Gesture.Pan()
      .enabled(phase === 'closed' || phase === 'open')
      .activeOffsetY([-12, 12])
      .failOffsetX([-40, 40])
      .onStart(() => {
        if (isOpen) runOnJS(hideKeyboard)();
      })
      .onUpdate((e) => {
        const up = Math.min(0, e.translationY);
        if (isOpen) {
          o.value = 1 - Math.min(1, -up / FOLD_DRAG);
          drag.value = up * 0.18;
        } else {
          drag.value = e.translationY < 0 ? e.translationY : e.translationY * 0.15;
        }
      })
      .onEnd((e) => {
        const go = isOpen
          ? o.value < 0.65 || e.velocityY < -700
          : e.translationY < -80 || e.velocityY < -650;
        if (go) {
          runOnJS(shelve)();
        } else {
          if (isOpen) o.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
          drag.value = withSpring(0, { damping: 18, stiffness: 200 });
        }
      });
  }, [phase, shelve]);

  /* ---------- 애니메이션 ---------- */

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: p.value * interpolate(drag.value, [-260, 0], [0.35, 1], CLAMP),
  }));

  const stageStyle = useAnimatedStyle(() => {
    const kp = interpolate(p.value, [0, 1], [geo.k0, geo.kc]);
    const k = kp + (1 - geo.kc) * o.value;
    const xp = interpolate(p.value, [0, 1], [geo.x0, geo.xc]);
    const x = xp + (geo.xo - geo.xc) * o.value;
    const lift = -26 * Math.sin(p.value * Math.PI);
    const yp = interpolate(p.value, [0, 1], [geo.y0, geo.yc]) + lift;
    const y = yp + (geo.yo - geo.yc) * o.value + drag.value;
    return {
      transform: [{ translateX: x - CW / 2 }, { translateY: y - CH / 2 }, { scale: k }],
    };
  });

  // 각 면은 "가운데 축 회전"만 3D로 주고(안드로이드에서 깔끔하게 분해되는 유일한 형태),
  // 경첩(책등과 맞닿은 모서리)이 제자리에 있도록 바깥 뷰에서 2D 이동/확대로 보정한다.
  // transformOrigin + perspective 조합은 안드로이드에서 행렬 분해가 꼬여 면이 뒤집히거나 부풀어서 쓰지 않는다.
  const theta = () => {
    'worklet';
    return interpolate(p.value, [0, 1], [0, CLOSED_TILT]) + interpolate(o.value, [0, 0.2], [0, 90 - CLOSED_TILT], CLAMP);
  };
  const phi = () => {
    'worklet';
    return interpolate(o.value, [0.18, 1], [0, 180], CLAMP);
  };
  const pin = (r, xh) => {
    'worklet';
    const rad = (r * Math.PI) / 180;
    return {
      transform: [
        { translateX: xh * (1 - Math.cos(rad)) },
        { scale: 1 + (xh * Math.sin(rad)) / PERSPECTIVE },
      ],
    };
  };
  const spin = (r) => {
    'worklet';
    return { transform: [{ perspective: PERSPECTIVE }, { rotateY: `${r}deg` }] };
  };

  const spineOuter = useAnimatedStyle(() => {
    const t = theta();
    return { opacity: t < 88 ? 1 : 0, ...pin(-t, tb / 2) };
  });
  const spineInner = useAnimatedStyle(() => spin(-theta()));
  const spineShade = useAnimatedStyle(() => ({ opacity: (theta() / 90) * 0.4 }));

  const coverOuter = useAnimatedStyle(() => {
    const a = 90 - theta() - phi();
    return { opacity: a < 88 && a > -90 ? 1 : 0, ...pin(a, -PAGE_W / 2) };
  });
  const coverInner = useAnimatedStyle(() => spin(90 - theta() - phi()));
  const coverShade = useAnimatedStyle(() => ({
    opacity: (Math.abs(90 - theta() - phi()) / 90) * 0.3,
  }));
  const tabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(o.value, [0, 0.1], [1, 0], CLAMP),
  }));

  const leftOuter = useAnimatedStyle(() => {
    const b = 180 - phi();
    return { opacity: b < 90 ? 1 : 0, ...pin(b, PAGE_W / 2) };
  });
  const leftInner = useAnimatedStyle(() => spin(180 - phi()));
  const leftShade = useAnimatedStyle(() => ({ opacity: ((180 - phi()) / 90) * 0.3 }));

  const rightStyle = useAnimatedStyle(() => ({
    opacity: o.value > 0.12 ? 1 : 0,
  }));
  const castShadow = useAnimatedStyle(() => {
    const phi = interpolate(o.value, [0.18, 1], [0, 180], CLAMP);
    return { opacity: Math.sin((phi * Math.PI) / 180) * 0.4 };
  });

  const groundStyle = useAnimatedStyle(() => ({
    opacity: p.value * 0.9,
    transform: [{ scaleX: 0.75 + o.value * 0.55 }],
  }));

  /* ---------- 내용 ---------- */

  const ratio = progressRatio(book);
  const pct = Math.round(ratio * 100);
  const remain = book.totalPages - book.currentPage;
  const leftStack = 2 + 10 * ratio;
  const rightStack = 2 + 10 * (1 - ratio);

  const hintVisible = phase === 'closed' || phase === 'open';
  // 펼친 면들은 책을 다 꺼낸 뒤에 만든다(꺼내는 첫 프레임에 무거운 그림을 한꺼번에 만들면 버벅임).
  const pagesReady = phase !== 'in';

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]} pointerEvents="none">
          <LinearGradient
            colors={['rgba(20,24,33,0.5)', colors.scrim, 'rgba(20,24,33,0.78)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View style={[styles.stage, stageStyle]} pointerEvents="box-none">
          <Animated.View style={[styles.ground, groundStyle]} pointerEvents="none">
            <Svg width={PAGE_W * 2} height={40}>
              <Defs>
                <RadialGradient id="g" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0" stopColor="#000" stopOpacity="0.55" />
                  <Stop offset="1" stopColor="#000" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Ellipse cx={PAGE_W} cy={20} rx={PAGE_W} ry={18} fill="url(#g)" />
            </Svg>
          </Animated.View>

          {/* 오른쪽: 뒤표지 + 남은 페이지 */}
          {pagesReady && (
          <Animated.View style={[styles.right, rightStyle]} renderToHardwareTextureAndroid={phase !== 'open'}>
            <PageBlock book={book} side="right" width={PAGE_W} height={BOOK_H} stack={rightStack}>
              <Text style={styles.runningHead}>지금 읽는 곳</Text>
              <View style={styles.inputArea}>
                <Text style={styles.ask}>몇 쪽까지 읽었나요?</Text>
                <TextInput
                  value={pageText}
                  onChangeText={(t) => setPageText(t.replace(/[^0-9]/g, '').slice(0, 5))}
                  onEndEditing={commit}
                  onSubmitEditing={commit}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  selectTextOnFocus
                  cursorColor={colors.navy}
                  selectionColor="rgba(27,35,51,0.18)"
                  selectionHandleColor={colors.navy}
                  style={styles.input}
                />
                <View style={styles.inputRule} />
                <Text style={styles.ofTotal}>/ {book.totalPages}쪽</Text>
              </View>
              <Text style={[styles.folio, { textAlign: 'right' }]}>{book.currentPage + 1}</Text>
            </PageBlock>
            <Animated.View style={[styles.castShadow, castShadow]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </Animated.View>
          )}

          {/* 책등 */}
          <Animated.View style={[styles.face, { width: tb, left: HINGE - tb }, spineOuter]} pointerEvents="none">
            <Animated.View style={[{ width: tb, height: BOOK_H }, spineInner]} renderToHardwareTextureAndroid>
              <SpineFace book={book} width={tb} height={BOOK_H} />
              <Animated.View style={[StyleSheet.absoluteFill, styles.shade, spineShade]} />
            </Animated.View>
          </Animated.View>

          {/* 넘어가는 앞표지: 앞면 */}
          <Animated.View style={[styles.face, { width: PAGE_W, left: HINGE }, coverOuter]} pointerEvents="none">
            <Animated.View style={[{ width: PAGE_W, height: BOOK_H }, coverInner]} renderToHardwareTextureAndroid>
              <CoverFace book={book} width={PAGE_W} height={BOOK_H} tabStyle={tabStyle} />
              <Animated.View style={[styles.coverShadeBox, styles.shade, coverShade]} />
            </Animated.View>
          </Animated.View>

          {/* 넘어간 앞표지: 뒷면 = 읽은 페이지 */}
          {pagesReady && (
          <Animated.View style={[styles.face, { width: PAGE_W, left: HINGE - PAGE_W }, leftOuter]} pointerEvents="none">
            <Animated.View style={[{ width: PAGE_W, height: BOOK_H }, leftInner]} renderToHardwareTextureAndroid>
            <PageBlock book={book} side="left" width={PAGE_W} height={BOOK_H} stack={leftStack}>
              <Text numberOfLines={1} style={styles.runningHead}>
                {book.title}
              </Text>
              <View style={styles.statArea}>
                <Text style={styles.statLabel}>읽은 만큼</Text>
                <Text style={styles.pct}>
                  {pct}
                  <Text style={styles.pctSign}>%</Text>
                </Text>
                <View style={styles.statRule} />
                <Text style={styles.statLine}>
                  {book.currentPage} / {book.totalPages}쪽
                </Text>
                <Text style={styles.statSub}>남은 {remain}쪽</Text>
              </View>
              <Text style={styles.folio}>{book.currentPage}</Text>
            </PageBlock>
            <Animated.View style={[StyleSheet.absoluteFill, styles.shade, leftShade]} />
            </Animated.View>
          </Animated.View>
          )}
        </Animated.View>

        {phase === 'closed' && (
          <Pressable
            onPress={openBook}
            style={{
              position: 'absolute',
              left: geo.xc - tb * 0.3 * geo.kc - 10,
              top: geo.yc - (BOOK_H * geo.kc) / 2,
              width: (PAGE_W + tb * 0.3) * geo.kc + 20,
              height: BOOK_H * geo.kc,
            }}
          />
        )}

        {hintVisible && (
          <View style={styles.hint} pointerEvents="none">
            <Svg width={28} height={14}>
              <Path d="M3 11 L14 3 L25 11" stroke="rgba(255,255,255,0.7)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CW,
    height: CH,
  },
  ground: {
    position: 'absolute',
    left: HINGE - PAGE_W,
    top: M + BOOK_H - 16,
  },
  right: {
    position: 'absolute',
    left: HINGE,
    top: M,
    width: PAGE_W,
    height: BOOK_H,
  },
  castShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: PAGE_W * 0.55,
  },
  face: {
    position: 'absolute',
    top: M,
    height: BOOK_H,
  },
  coverShadeBox: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PAGE_W,
    height: BOOK_H,
    borderRadius: 3,
  },
  shade: {
    backgroundColor: '#000',
  },
  runningHead: {
    fontFamily: font.semibold,
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: colors.ink,
    opacity: 0.45,
    textAlign: 'center',
  },
  statArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontFamily: font.regular,
    fontSize: 10,
    color: colors.ink,
    opacity: 0.55,
    marginBottom: 2,
  },
  pct: {
    fontFamily: font.bold,
    fontSize: 40,
    color: colors.ink,
    letterSpacing: -1,
  },
  pctSign: {
    fontFamily: font.semibold,
    fontSize: 18,
  },
  statRule: {
    width: 34,
    height: 1,
    backgroundColor: colors.navy,
    marginVertical: 10,
  },
  statLine: {
    fontFamily: font.semibold,
    fontSize: 11.5,
    color: colors.ink,
  },
  statSub: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: 10,
    color: colors.ink,
    opacity: 0.5,
  },
  inputArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ask: {
    fontFamily: font.regular,
    fontSize: 10.5,
    color: colors.ink,
    opacity: 0.6,
    marginBottom: 4,
  },
  input: {
    minWidth: 90,
    textAlign: 'center',
    fontFamily: font.bold,
    fontSize: 34,
    color: colors.ink,
    paddingVertical: 0,
  },
  inputRule: {
    width: 96,
    height: 1,
    backgroundColor: colors.ink,
    opacity: 0.35,
    marginTop: 2,
  },
  ofTotal: {
    marginTop: 6,
    fontFamily: font.regular,
    fontSize: 11,
    color: colors.ink,
    opacity: 0.55,
  },
  folio: {
    fontFamily: font.regular,
    fontSize: 9,
    color: colors.ink,
    opacity: 0.45,
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 54,
    alignItems: 'center',
  },
  hintChevron: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 16,
    marginBottom: 2,
  },
  hintText: {
    fontFamily: font.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
  },
});
