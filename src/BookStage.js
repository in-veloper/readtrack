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
  withSequence,
  withDelay,
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

// 각 면은 "가운데 축 회전"만 3D로 주고(안드로이드에서 깔끔하게 분해되는 유일한 형태),
// 경첩(책등과 맞닿은 모서리)이 제자리에 있도록 바깥 뷰에서 2D 이동/확대로 보정한다.
// transformOrigin + perspective 조합은 안드로이드에서 행렬 분해가 꼬여 면이 뒤집히거나 부풀어서 쓰지 않는다.
// 헬퍼는 공유값을 직접 읽지 않고 값을 인자로 받는다(위 ※ 주석 참고).

// θ: 책 전체가 정면을 보도록 눕는 각, φ: 표지가 열리는 각. 두 구간을 넓게
// 겹쳐서 "휙 눕고 → 따로 표지가 열리는" 두 동작이 아니라 한 동작으로 펼쳐지게 한다.
function thetaOf(pv, ov) {
  'worklet';
  return interpolate(pv, [0, 1], [0, CLOSED_TILT]) + interpolate(ov, [0, 0.55], [0, 90 - CLOSED_TILT], CLAMP);
}
function phiOf(ov) {
  'worklet';
  return interpolate(ov, [0.08, 1], [0, 180], CLAMP);
}
function pin(r, xh) {
  'worklet';
  const rad = (r * Math.PI) / 180;
  return {
    transform: [
      { translateX: xh * (1 - Math.cos(rad)) },
      { scale: 1 + (xh * Math.sin(rad)) / PERSPECTIVE },
    ],
  };
}
function spin(r) {
  'worklet';
  return { transform: [{ perspective: PERSPECTIVE }, { rotateY: `${r}deg` }] };
}

// 읽은 쪽(왼쪽 면)에 찍히는 글 — 덮을 때 맨 윗장과 함께 넘어가도록 두 곳에서 같이 쓴다.
function LeftPageContent({ book, pct, remain }) {
  return (
    <>
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
    </>
  );
}

// 읽은 만큼의 종이 한 장. 덮을 때 표지만 넘어가는 게 아니라 읽은 쪽 묶음이 표지와 함께 넘어오고,
// 맨 윗장(g 가 가장 큰 장)이 앞서고 표지가 뒤따르며 부채처럼 벌어졌다가 오른쪽에 차곡차곡 포개진다.
// 표지 진행도 u(0 덮임 ~ 1 펼침)를 u^(1+g) 로 바꿔 장마다 앞서는 정도만 달리하고, 시작(1)과 끝(0)에서는
// 표지와 같은 자리에 오게 한다. 표지 뒷면(왼쪽 면)과 같은 회전·보정 식을 쓴다.
function sheetAngle(pv, ov, g) {
  'worklet';
  const u = phiOf(ov) / 180;
  return 270 - thetaOf(pv, ov) - 180 * Math.pow(u, 1 + g);
}

function Sheet({ p, o, ws, hs, g, top, tone, children }) {
  // ※ 공유값은 스타일 함수 안에서 직접 읽는다(위 주석 참고)
  const outer = useAnimatedStyle(() => {
    const b = sheetAngle(p.value, o.value, g);
    // 펼친 상태에서는 맨 윗장만 보이게(아래 장들은 그 밑에 완전히 겹쳐 있다)
    const u = phiOf(o.value) / 180;
    return { opacity: top ? 1 : interpolate(u, [0.97, 0.99], [1, 0], CLAMP), ...pin(b, ws / 2) };
  });
  const inner = useAnimatedStyle(() => spin(sheetAngle(p.value, o.value, g)));
  const shade = useAnimatedStyle(() => ({
    opacity: Math.min(0.3, (Math.max(0, sheetAngle(p.value, o.value, g)) / 90) * 0.3),
  }));

  return (
    <Animated.View
      style={[styles.face, { width: ws, height: hs, top: M + 6, left: HINGE - ws }, outer]}
      pointerEvents="none"
    >
      <Animated.View style={[{ width: ws, height: hs, borderRadius: 2, backgroundColor: tone }, inner]} renderToHardwareTextureAndroid>
        {top && (
          <>
            {/* 왼쪽 면 종이와 같은 결(바깥은 밝고 경첩 쪽으로 어두워짐) — 펼친 상태에서 그 면과 겹쳐도 티가 안 난다 */}
            <LinearGradient
              colors={['#F2EBDD', '#F9F5EC', '#F7F2E8', '#EFE7D7', '#E3D8C3']}
              locations={[0, 0.15, 0.78, 0.93, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={[
                'rgba(58,46,28,0)',
                'rgba(58,46,28,0)',
                'rgba(58,46,28,0.025)',
                'rgba(58,46,28,0.06)',
                'rgba(58,46,28,0.11)',
                'rgba(58,46,28,0.16)',
              ]}
              locations={[0, 0.74, 0.85, 0.92, 0.97, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </>
        )}
        {!top && <View style={[StyleSheet.absoluteFill, styles.sheetEdge]} />}
        {children}
        <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shade]} />
      </Animated.View>
    </Animated.View>
  );
}

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
    // 대칭형 inOut 하나로만 쭉 가면 가속/감속이 똑같은 비중이라 기계적으로
    // 느껴진다 — 실제로 표지를 넘기면 손이 휙 밀어준 뒤 표지 자체 무게로
    // 천천히 가라앉고, 다 펼쳐지는 순간 경첩이 살짝 튕겼다가 멎는다. 빠르게
    // 열리다 감속하는 구간(ease-out) 뒤에 짧은 스프링으로 마무리해서
    // 그 "툭 열리고 사뿐히 안착하는" 느낌을 흉내 낸다.
    // 예전엔 0.92 까지 감속해 거의 멈춘 뒤 스프링이 다시 출발시켜서, 다 펼쳐질 때쯤
    // 한 번 "멈칫"했다. 빠르게 열리기 시작해 끝까지 한 번에 사뿐히 감속하는 곡선 하나로 잇는다.
    o.value = withTiming(
      1,
      { duration: OPEN_MS, easing: Easing.bezier(0.22, 0.75, 0.25, 1) },
      (done) => {
        if (done) runOnJS(setPhase)('open');
      }
    );
  };

  const flyBack = () => {
    drag.value = withTiming(0, { duration: BACK_MS, easing: Easing.inOut(Easing.cubic) });
    p.value = withTiming(0, { duration: BACK_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
      if (done) runOnJS(onClosed)();
    });
  };

  // 지금 펼쳐진 정도(o)에서 이어서 덮고 책장으로 돌아간다. 예전엔 "다 덮고 →
  // 멈췄다 → 날아감" 두 동작이 이어 붙어서 중간에 한 번 멎었다 — 덮이는 도중에
  // 이미 책장 쪽으로 움직이기 시작하게 겹쳐서 한 동작처럼 흘러가게 한다.
  const shelve = useCallback(() => {
    if (phase !== 'closed' && phase !== 'open') return;
    Keyboard.dismiss();
    commit();
    setPhase('out');
    if (o.value > 0.001) {
      const dur = Math.max(320, CLOSE_MS * o.value);
      const lead = dur * 0.55;
      const back = { duration: BACK_MS, easing: Easing.inOut(Easing.cubic) };
      o.value = withTiming(0, { duration: dur, easing: Easing.inOut(Easing.quad) });
      drag.value = withDelay(lead, withTiming(0, back));
      p.value = withDelay(
        lead,
        withTiming(0, back, (done) => {
          if (done) runOnJS(onClosed)();
        })
      );
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

  // ※ 각 스타일 안에서 p.value / o.value 를 "직접" 읽어야 한다. Reanimated 는
  // 스타일 함수가 직접 붙잡은 공유값만 감시하고, 헬퍼 함수 안쪽은 들여다보지
  // 않는다. 예전엔 theta()/phi() 헬퍼 안에서만 읽어서, 폰에서는 이 면들이
  // 프레임마다 갱신되지 않고 phase 가 바뀌어 리렌더될 때만 한 번씩 튀었다 —
  // 그래서 "닫힘 → (뚝) → 펼침" 두세 장면으로만 보이고, 접어서 넣을 땐 펼친
  // 채로 책장에 날아가 꽂혔다.

  // 얼굴이 뒤집히기 직전/직후를 즉시 0/1로 껐다 켜던 걸 각도 몇 도짜리
  // 짧은 구간에서 서서히 페이드되게 바꿔서, 눈에 띄는 "뚝" 끊김을 없앤다.
  const spineOuter = useAnimatedStyle(() => {
    const t = thetaOf(p.value, o.value);
    return { opacity: interpolate(t, [84, 90], [1, 0], CLAMP), ...pin(-t, tb / 2) };
  });
  const spineInner = useAnimatedStyle(() => spin(-thetaOf(p.value, o.value)));
  const spineShade = useAnimatedStyle(() => ({ opacity: (thetaOf(p.value, o.value) / 90) * 0.4 }));

  const coverOuter = useAnimatedStyle(() => {
    const a = 90 - thetaOf(p.value, o.value) - phiOf(o.value);
    return { opacity: interpolate(a, [-96, -90, 84, 90], [0, 1, 1, 0], CLAMP), ...pin(a, -PAGE_W / 2) };
  });
  const coverInner = useAnimatedStyle(() => spin(90 - thetaOf(p.value, o.value) - phiOf(o.value)));
  const coverShade = useAnimatedStyle(() => ({
    opacity: (Math.abs(90 - thetaOf(p.value, o.value) - phiOf(o.value)) / 90) * 0.3,
  }));
  const tabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(o.value, [0, 0.1], [1, 0], CLAMP),
  }));

  // 표지 뒷면(왼쪽 페이지)의 실제 각도는 표지 각도(90-θ-φ)에서 180° 돈 것.
  const leftOuter = useAnimatedStyle(() => {
    const b = 270 - thetaOf(p.value, o.value) - phiOf(o.value);
    return { opacity: interpolate(b, [84, 96], [1, 0], CLAMP), ...pin(b, PAGE_W / 2) };
  });
  const leftInner = useAnimatedStyle(() => spin(270 - thetaOf(p.value, o.value) - phiOf(o.value)));
  const leftShade = useAnimatedStyle(() => ({
    opacity: (Math.max(0, 270 - thetaOf(p.value, o.value) - phiOf(o.value)) / 90) * 0.3,
  }));

  // 뒤표지+남은 페이지 덩어리도 덮인 표지와 같은 몸통 각도(90-θ)로 같이 돌려서
  // 책 전체가 한 덩어리로 기울게 한다(예전엔 늘 정면에 납작하게 남아 있었다).
  const rightOuter = useAnimatedStyle(() => ({
    opacity: interpolate(phiOf(o.value), [0, 6], [0, 1], CLAMP),
    ...pin(90 - thetaOf(p.value, o.value), -PAGE_W / 2),
  }));
  const rightInner = useAnimatedStyle(() => spin(90 - thetaOf(p.value, o.value)));
  const castShadow = useAnimatedStyle(() => ({
    opacity: Math.sin((phiOf(o.value) * Math.PI) / 180) * 0.4,
  }));

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

  // 덮을 때 표지와 함께 넘어오는 읽은 종이 묶음. 읽은 비율이 클수록 장수가 많고 더 넓게 벌어진다.
  const sheetCount = book.currentPage > 0 ? Math.max(2, Math.min(8, Math.round(2 + 6 * ratio))) : 0;
  const fan = 0.35 + 0.9 * ratio;
  const sheetW = PAGE_W - 6 - leftStack;
  const sheetH = BOOK_H - 12 - 0.6 * leftStack;
  const SHEET_TONES = ['#F1EADC', '#E6DCC9'];

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
          <Animated.View style={[styles.right, rightOuter]} renderToHardwareTextureAndroid={phase !== 'open'}>
            <Animated.View style={[{ width: PAGE_W, height: BOOK_H }, rightInner]}>
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
          </Animated.View>
          )}

          {/* 책등 */}
          <Animated.View style={[styles.face, { width: tb, left: HINGE - tb }, spineOuter]} pointerEvents="none">
            <Animated.View style={[{ width: tb, height: BOOK_H }, spineInner]} renderToHardwareTextureAndroid>
              <SpineFace book={book} width={tb} height={BOOK_H} joined />
              <Animated.View style={[StyleSheet.absoluteFill, styles.shade, spineShade]} />
            </Animated.View>
          </Animated.View>

          {/* 넘어간 앞표지: 뒷면 = 읽은 페이지 (읽은 쪽이 있으면 글은 맨 윗장이 들고 있다) */}
          {pagesReady && (
          <Animated.View style={[styles.face, { width: PAGE_W, left: HINGE - PAGE_W }, leftOuter]} pointerEvents="none">
            <Animated.View style={[{ width: PAGE_W, height: BOOK_H }, leftInner]} renderToHardwareTextureAndroid>
            <PageBlock book={book} side="left" width={PAGE_W} height={BOOK_H} stack={leftStack}>
              {sheetCount === 0 && <LeftPageContent book={book} pct={pct} remain={remain} />}
            </PageBlock>
            <Animated.View style={[StyleSheet.absoluteFill, styles.shade, leftShade]} />
            </Animated.View>
          </Animated.View>
          )}

          {/* 읽은 종이 묶음: 표지 앞쪽에서 먼저 넘어오고, 맨 윗장이 가장 앞선다 */}
          {pagesReady &&
            Array.from({ length: sheetCount }, (_, i) => {
              const top = i === sheetCount - 1;
              return (
                <Sheet
                  key={i}
                  p={p}
                  o={o}
                  ws={sheetW}
                  hs={sheetH}
                  g={(fan * (i + 1)) / sheetCount}
                  top={top}
                  tone={SHEET_TONES[i % 2]}
                >
                  {top && (
                    <View style={{ position: 'absolute', left: 10, width: sheetW - 26, top: 16, bottom: 10 }}>
                      <LeftPageContent book={book} pct={pct} remain={remain} />
                    </View>
                  )}
                </Sheet>
              );
            })}

          {/* 넘어가는 앞표지: 앞면 — 종이 묶음보다 나중에 그려서 넘어온 뒤엔 종이를 덮는다 */}
          <Animated.View style={[styles.face, { width: PAGE_W, left: HINGE }, coverOuter]} pointerEvents="none">
            <Animated.View style={[{ width: PAGE_W, height: BOOK_H }, coverInner]} renderToHardwareTextureAndroid>
              <CoverFace book={book} width={PAGE_W} height={BOOK_H} tabStyle={tabStyle} />
              <Animated.View style={[styles.coverShadeBox, styles.shade, coverShade]} />
            </Animated.View>
          </Animated.View>
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
  sheetEdge: {
    borderWidth: 0.5,
    borderColor: 'rgba(120,100,70,0.45)',
    borderRadius: 2,
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
