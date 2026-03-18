import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { YStack, styled } from 'tamagui';

const SheetContent = styled(YStack, {
  padding: '$6',
  paddingBottom: '$8',
});

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  fullHeight?: boolean;
};

export function ModalSheet({ visible, onClose, children, fullHeight }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <Pressable style={styles.overlayTouchable} onPress={onClose} />
          <View style={[styles.content, fullHeight && styles.contentFull]}>
            <View style={styles.dragHandleArea}>
              <View style={styles.handle} />
            </View>
            <SheetContent style={fullHeight ? styles.sheetContentFull : undefined}>
              {children}
            </SheetContent>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export { SheetContent };

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 8, 8, 0.92)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  content: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  contentFull: {
    height: '85%',
    flexDirection: 'column' as const,
  },
  dragHandleArea: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  sheetContentFull: {
    flex: 1,
    minHeight: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#383838',
    borderRadius: 2,
    alignSelf: 'center',
  },
});
