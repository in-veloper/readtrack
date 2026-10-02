import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import BookSpine from './BookSpine';
import { colors, font } from './theme';
import { SCREEN, shelfSize } from './geometry';

const SIDE = 20;
const ROW_H = 204;

function layoutRows(books) {
  const max = SCREEN.w - SIDE * 2 - 16;
  const rows = [];
  let row = [];
  let used = 0;
  books.forEach((b) => {
    const w = shelfSize(b).t + 3;
    if (row.length && used + w > max) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(b);
    used += w;
  });
  if (row.length) rows.push(row);
  return rows;
}

// 벽에 떠 있는 얇은 오크 선반
function Shelf() {
  const w = SCREEN.w - SIDE * 2;
  return (
    <View>
      <View style={styles.shelfTop} />
      <LinearGradient colors={[colors.oakFace, colors.oakFaceDark]} style={styles.shelfFace}>
        <Svg width={w} height={10} style={StyleSheet.absoluteFill}>
          <Path d={`M0 3 C ${w * 0.3} 2, ${w * 0.6} 5, ${w} 3.5`} stroke="rgba(120,80,40,0.18)" strokeWidth="0.7" fill="none" />
          <Path d={`M0 7 C ${w * 0.25} 8, ${w * 0.55} 6, ${w} 7.5`} stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" fill="none" />
        </Svg>
      </LinearGradient>
      <LinearGradient
        colors={['rgba(70,50,30,0.22)', 'rgba(70,50,30,0)']}
        style={styles.shelfShadow}
        pointerEvents="none"
      />
    </View>
  );
}

function WoodShelf({ books, onSelectBook, hiddenId }) {
  const rows = layoutRows(books);
  const shelfCount = Math.max(rows.length, 3);

  return (
    <View style={styles.fill}>
      <LinearGradient colors={[colors.wallTop, colors.wallBottom]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {Array.from({ length: shelfCount }).map((_, i) => {
          const row = rows[i] || [];
          return (
            <View key={i} style={styles.rowBlock}>
              <View style={styles.booksRow}>
                {row.map((book) => (
                  <BookSpine key={book.id} book={book} onPress={onSelectBook} hidden={book.id === hiddenId} />
                ))}
              </View>
              <Shelf />
            </View>
          );
        })}
        {books.length === 0 && (
          <View style={styles.emptyWrap} pointerEvents="none">
            <Text style={styles.emptyText}>아직 꽂힌 책이 없어요</Text>
            <Text style={styles.emptySub}>아래 버튼으로 첫 책을 꽂아보세요</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    paddingTop: 4,
    paddingBottom: 140,
    paddingHorizontal: SIDE,
  },
  rowBlock: {
    marginBottom: 26,
  },
  booksRow: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  shelfTop: {
    height: 5,
    backgroundColor: colors.oakTop,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  shelfFace: {
    height: 10,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  shelfShadow: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: 15,
    height: 22,
  },
  emptyWrap: {
    position: 'absolute',
    top: ROW_H / 2 - 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.navy,
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.inkSoft,
  },
});

export default React.memo(WoodShelf);
