import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';

import { init, useStore, addBook, updateBook, removeBook, updateProgress, moveBook } from './src/store';
import WoodShelf from './src/WoodShelf';
import AddBookModal from './src/AddBookModal';
import BookStage from './src/BookStage';
import { colors, font } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    [font.regular]: require('./assets/fonts/Pretendard-Regular.ttf'),
    [font.semibold]: require('./assets/fonts/Pretendard-SemiBold.ttf'),
    [font.bold]: require('./assets/fonts/Pretendard-Bold.ttf'),
  });

  const state = useStore();
  const [addVisible, setAddVisible] = useState(false);
  const [selected, setSelected] = useState(null); // { id, origin }
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    init();
  }, []);

  const selectBook = useCallback((book, origin) => setSelected({ id: book.id, origin }), []);
  const editBook = useCallback((book) => setEditingId(book.id), []);

  if (!fontsLoaded || !state.loaded) {
    return <View style={styles.splash} />;
  }

  const selectedBook = selected && state.books.find((b) => b.id === selected.id);
  const editingBook = editingId ? state.books.find((b) => b.id === editingId) : null;
  const closeSheet = () => {
    setAddVisible(false);
    setEditingId(null);
  };

  return (
    <GestureHandlerRootView style={styles.fill}>
      <View style={styles.fill}>
        <StatusBar style={selected ? 'light' : 'dark'} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>READTRACK</Text>
        </View>

        <WoodShelf
          books={state.books}
          hiddenId={selected?.id}
          onSelectBook={selectBook}
          onEditBook={editBook}
        />

        {!selected && (
          <View style={styles.fabWrap} pointerEvents="box-none">
            <Pressable
              onPress={() => setAddVisible(true)}
              style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            >
              <View style={styles.plus}>
                <View style={[styles.plusBar, styles.plusH]} />
                <View style={[styles.plusBar, styles.plusV]} />
              </View>
              <Text style={styles.fabText}>책 꽂기</Text>
            </Pressable>
          </View>
        )}

        <AddBookModal
          visible={addVisible || !!editingBook}
          book={editingBook}
          index={editingBook ? state.books.findIndex((b) => b.id === editingBook.id) : -1}
          count={state.books.length}
          onMove={moveBook}
          onClose={closeSheet}
          onSubmit={(payload) => {
            if (editingBook) {
              updateBook(editingBook.id, {
                title: payload.title.trim(),
                totalPages: payload.totalPages,
                currentPage: Math.min(payload.currentPage, payload.totalPages),
                color: payload.color,
              });
            } else {
              addBook(payload);
            }
            closeSheet();
          }}
          onDelete={(id) => {
            removeBook(id);
            closeSheet();
          }}
        />

        {selectedBook && (
          <BookStage
            key={selected.id}
            book={selectedBook}
            origin={selected.origin}
            onSave={updateProgress}
            onClosed={() => setSelected(null)}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.wallTop },
  splash: {
    flex: 1,
    backgroundColor: colors.wallTop,
  },
  header: {
    paddingTop: 58,
    paddingBottom: 10,
    paddingHorizontal: 28,
    backgroundColor: colors.wallTop,
  },
  headerTitle: {
    fontFamily: font.bold,
    fontSize: 18,
    letterSpacing: 5,
    color: colors.navy,
  },
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingLeft: 20,
    paddingRight: 24,
    borderRadius: 26,
    backgroundColor: colors.navy,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  plus: {
    width: 14,
    height: 14,
    marginRight: 10,
  },
  plusBar: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  plusH: {
    left: 0,
    right: 0,
    top: 6,
    height: 2,
  },
  plusV: {
    top: 0,
    bottom: 0,
    left: 6,
    width: 2,
  },
  fabText: {
    fontFamily: font.semibold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
