import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { SpineFace } from './faces';
import { BOOK_H, shelfSize, baseThickness } from './geometry';

function BookSpine({ book, onPress, onLongPress, hidden }) {
  const ref = useRef(null);
  const { h, t } = shelfSize(book);
  const tb = baseThickness(book);
  const scale = h / BOOK_H;

  // hidden(꺼내서 펼친 책)은 즉시 0/1로 바꾼다 — 꺼내거나 꽂는 순간 날아다니는
  // 책(BookStage)이 정확히 이 자리에 겹쳐서 넘겨받기 때문에, 여기서 페이드를
  // 걸면 꽂히는 순간 반투명한 회색 책이 한 번 깜빡인다. 추가/삭제로 실제
  // 마운트/언마운트될 때는 entering/exiting 이, 옆 칸들이 자리를 옮길 때는
  // layout 이 맡는다.

  const handlePress = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      onPress(book, { x, y, width, height });
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onLongPress?.(book);
      }}
      delayLongPress={380}
      disabled={hidden}
    >
      <Animated.View
        ref={ref}
        collapsable={false}
        entering={FadeIn.duration(280)}
        exiting={FadeOut.duration(200)}
        layout={LinearTransition.duration(260)}
        style={{ width: t, height: h, marginHorizontal: 1.5, overflow: 'hidden', opacity: hidden ? 0 : 1 }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: (t - tb) / 2,
            top: (h - BOOK_H) / 2,
            transform: [{ scale }],
          }}
        >
          <SpineFace book={book} width={tb} height={BOOK_H} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default React.memo(BookSpine);
