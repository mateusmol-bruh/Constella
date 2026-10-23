import React, { type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from './Artwork';
import { Button, Header } from './ui';
import { colors, ui } from '../styles/theme';

export function CollectionRow({ title, subtitle, foto, onPress, trailing }: { title: string; subtitle: string; foto?: string | null; onPress: () => void; trailing?: ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title + '. ' + subtitle} onPress={onPress} style={({ pressed }) => [ui.card, ui.row, { padding: 14, opacity: pressed ? 0.75 : 1 }]}>
    <Avatar nome={title} foto={foto} size={50} /><View style={{ flex: 1, gap: 5 }}><Text numberOfLines={2} style={[ui.body, { fontSize: 18 }]}>{title}</Text><Text numberOfLines={2} style={ui.muted}>{subtitle}</Text></View>{trailing}
  </Pressable>;
}
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#100D32CC', justifyContent: 'center', padding: 20 }}>
      <View style={{ backgroundColor: colors.purple, borderRadius: 24, padding: 22, maxHeight: '90%', width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        <Header title={title} /><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>{children}<Button title="Fechar" variant="secondary" onPress={onClose} /></ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}
export const searchMatches = (text: string, query: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase());
