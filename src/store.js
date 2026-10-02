import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SPINE_COLORS } from './theme';

const STORAGE_KEY = 'bookmark.books.v1';

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function colorFor(index) {
  return SPINE_COLORS[index % SPINE_COLORS.length];
}

let state = {
  loaded: false,
  books: [],
};

let listeners = new Set();

function emit(next) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return state;
}

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ books: state.books }));
  } catch (e) {
    // 저장 실패는 다음 변경 때 다시 시도된다.
  }
}

export async function init() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : { books: [] };
    // 초기 버전의 갈색 계열 색은 나무 책장에 묻혀서, 지금 팔레트로 옮긴다.
    const books = (data.books || []).map((b, i) =>
      SPINE_COLORS.includes(b.color) ? b : { ...b, color: colorFor(i) }
    );
    emit({ loaded: true, books });
    if (books.some((b, i) => b !== data.books[i])) persist();
  } catch (e) {
    emit({ loaded: true, books: [] });
  }
}

export function nextColor() {
  return colorFor(state.books.length);
}

export function addBook({ title, totalPages, currentPage = 0, color }) {
  const book = {
    id: uid(),
    title: title.trim(),
    totalPages: Math.max(1, Math.round(totalPages)),
    currentPage: Math.max(0, Math.min(Math.round(currentPage), Math.round(totalPages))),
    color: color || colorFor(state.books.length),
    createdAt: Date.now(),
  };
  emit({ books: [...state.books, book] });
  persist();
  return book.id;
}

export function updateProgress(id, currentPage) {
  emit({
    books: state.books.map((b) =>
      b.id === id
        ? { ...b, currentPage: Math.max(0, Math.min(Math.round(currentPage), b.totalPages)) }
        : b
    ),
  });
  persist();
}

export function updateBook(id, patch) {
  emit({
    books: state.books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  });
  persist();
}

export function removeBook(id) {
  emit({ books: state.books.filter((b) => b.id !== id) });
  persist();
}

export function progressRatio(book) {
  if (!book.totalPages) return 0;
  return Math.max(0, Math.min(1, book.currentPage / book.totalPages));
}
