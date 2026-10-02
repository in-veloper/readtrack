import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';

import { SpineFace } from './faces';
import { BOOK_H, shelfSize, baseThickness } from './geometry';

function BookSpine({ book, onPress, hidden }) {
  const ref = useRef(null);
  const { h, t } = shelfSize(book);
  const tb = baseThickness(book);
  const scale = h / BOOK_H;

  const handlePress = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      onPress(book, { x, y, width, height });
    });
  };

  return (
    <Pressable onPress={handlePress} disabled={hidden}>
      <View
        ref={ref}
        collapsable={false}
        style={{ width: t, height: h, marginHorizontal: 1.5, opacity: hidden ? 0 : 1, overflow: 'hidden' }}
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
      </View>
    </Pressable>
  );
}

export default React.memo(BookSpine);
