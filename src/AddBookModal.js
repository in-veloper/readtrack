import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

import { CoverFace } from './faces';
import { PAGE_W, BOOK_H } from './geometry';
import { colors, font, SPINE_COLORS } from './theme';
import { nextColor } from './store';

const PREVIEW_SCALE = 0.44;

function Field({ label, children, style }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

// book 을 넘기면 "고치기" 모드 — 같은 시트로 제목·색·쪽수를 바꾸고 책을 뺄 수도 있다.
export default function AddBookModal({ visible, book, index = -1, count = 0, onMove, onClose, onSubmit, onDelete }) {
  const editing = !!book;
  const [title, setTitle] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('');
  const [color, setColor] = useState(SPINE_COLORS[0]);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setArmed(false);
    if (book) {
      setTitle(book.title);
      setTotalPages(String(book.totalPages));
      setCurrentPage(String(book.currentPage));
      setColor(book.color);
    } else {
      setColor(nextColor());
    }
  }, [visible, book?.id]);

  const reset = () => {
    setTitle('');
    setTotalPages('');
    setCurrentPage('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const total = parseInt(totalPages, 10) || 0;
  const current = Math.min(parseInt(currentPage, 10) || 0, total);
  const valid = title.trim().length > 0 && total > 0;

  const submit = () => {
    if (!valid) return;
    onSubmit({ title, totalPages: total, currentPage: current, color });
    reset();
  };

  const preview = {
    id: 'preview',
    title: title.trim() || '책 제목',
    totalPages: total,
    currentPage: current,
    color,
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.card}>
          <Text style={styles.heading}>{editing ? '책 고치기' : '새 책 꽂기'}</Text>

          <View style={styles.topRow}>
            <View style={styles.previewBox}>
              <View style={styles.previewInner}>
                <CoverFace book={preview} width={PAGE_W} height={BOOK_H} />
              </View>
            </View>

            <View style={styles.topFields}>
              <Field label="책 제목">
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="행정쟁송법"
                  placeholderTextColor="#B4B0A8"
                  style={styles.input}
                />
              </Field>
              <Text style={styles.label}>표지 색</Text>
              <View style={styles.swatches}>
                {SPINE_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[styles.swatchRing, c === color && styles.swatchRingOn]}
                    hitSlop={3}
                  >
                    <View style={[styles.swatch, { backgroundColor: c }]} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <Field label="전체 쪽수" style={styles.rowItem}>
              <TextInput
                value={totalPages}
                onChangeText={(t) => setTotalPages(t.replace(/[^0-9]/g, '').slice(0, 5))}
                placeholder="600"
                placeholderTextColor="#B4B0A8"
                keyboardType="number-pad"
                style={styles.input}
              />
            </Field>
            <Field label="읽은 쪽 (선택)" style={styles.rowItem}>
              <TextInput
                value={currentPage}
                onChangeText={(t) => setCurrentPage(t.replace(/[^0-9]/g, '').slice(0, 5))}
                placeholder="0"
                placeholderTextColor="#B4B0A8"
                keyboardType="number-pad"
                style={styles.input}
              />
            </Field>
          </View>

          {editing && onMove ? (
            // 책장에서의 자리 바꾸기 — 누를 때마다 한 칸씩, 뒤 시트에서 책이 옮겨 가는 게 보인다.
            <View style={styles.moveRow}>
              <Text style={styles.label}>책장에서의 자리</Text>
              <View style={styles.moveBtns}>
                <Pressable
                  onPress={() => onMove(book.id, -1)}
                  disabled={index <= 0}
                  style={({ pressed }) => [styles.moveBtn, index <= 0 && styles.moveBtnOff, pressed && { opacity: 0.7 }]}
                  hitSlop={4}
                >
                  <Text style={styles.moveText}>← 앞으로</Text>
                </Pressable>
                <Text style={styles.moveCount}>
                  {index + 1} / {count}
                </Text>
                <Pressable
                  onPress={() => onMove(book.id, 1)}
                  disabled={index < 0 || index >= count - 1}
                  style={({ pressed }) => [
                    styles.moveBtn,
                    (index < 0 || index >= count - 1) && styles.moveBtnOff,
                    pressed && { opacity: 0.7 },
                  ]}
                  hitSlop={4}
                >
                  <Text style={styles.moveText}>뒤로 →</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={!valid}
            style={({ pressed }) => [styles.submit, !valid && styles.submitOff, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.submitText}>{editing ? '저장' : '책장에 꽂기'}</Text>
          </Pressable>
          <View style={styles.bottomRow}>
            {editing ? (
              // 실수로 지우지 않게 두 번 눌러야 빠진다.
              <Pressable
                onPress={() => (armed ? onDelete(book.id) : setArmed(true))}
                style={[styles.cancel, armed && styles.deleteArmed]}
                hitSlop={6}
              >
                <Text style={[styles.cancelText, styles.deleteText]}>
                  {armed ? '한 번 더 누르면 빠져요' : '책장에서 빼기'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={close} style={styles.cancel} hitSlop={6}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 12,
    elevation: 16,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: 20,
    color: colors.navy,
    marginBottom: 18,
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  previewBox: {
    width: PAGE_W * PREVIEW_SCALE,
    height: BOOK_H * PREVIEW_SCALE,
    marginRight: 16,
    borderRadius: 3,
    backgroundColor: '#ddd',
    elevation: 6,
    shadowColor: '#000',
  },
  previewInner: {
    position: 'absolute',
    left: (PAGE_W * PREVIEW_SCALE - PAGE_W) / 2,
    top: (BOOK_H * PREVIEW_SCALE - BOOK_H) / 2,
    transform: [{ scale: PREVIEW_SCALE }],
  },
  topFields: {
    flex: 1,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontFamily: font.semibold,
    fontSize: 12,
    color: colors.inkSoft,
    marginBottom: 6,
  },
  input: {
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.navy,
    backgroundColor: colors.field,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  swatchRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchRingOn: {
    borderColor: colors.navy,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  moveRow: {
    marginTop: 2,
    marginBottom: 4,
  },
  moveBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.field,
  },
  moveBtnOff: {
    opacity: 0.35,
  },
  moveText: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  moveCount: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors.inkSoft,
  },
  submit: {
    marginTop: 6,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitOff: {
    opacity: 0.3,
  },
  submitText: {
    fontFamily: font.semibold,
    fontSize: 15,
    color: '#fff',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancel: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  deleteArmed: {
    backgroundColor: 'rgba(196,72,60,0.1)',
  },
  deleteText: {
    color: '#C4483C',
  },
  cancelText: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors.inkSoft,
  },
});
