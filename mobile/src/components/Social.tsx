import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from './Artwork';
import { ForumCover } from './ForumCover';
import { Icon } from './Icon';
import { Button, Header } from './ui';
import { colors, ui } from '../styles/theme';

export function CollectionRow({ title, subtitle, foto, onPress, trailing, variant = 'person' }: { title: string; subtitle: string; foto?: string | null; onPress: () => void; trailing?: ReactNode; variant?: 'person' | 'forum' }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title + '. ' + subtitle} onPress={onPress} style={({ pressed }) => [ui.card, ui.row, { padding: 14, opacity: pressed ? 0.75 : 1 }]}>
    {variant === 'forum' ? <ForumCover title={title} foto={foto} /> : <Avatar nome={title} foto={foto} size={44} />}<View style={{ flex: 1, gap: 5 }}><Text numberOfLines={2} style={[ui.body, { fontSize: 16 }]}>{title}</Text><Text numberOfLines={2} style={ui.muted}>{subtitle}</Text></View>{trailing && <View style={{ maxWidth: '32%', flexShrink: 1 }}>{trailing}</View>}
  </Pressable>;
}
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#100D32CC', justifyContent: 'center', padding: 16 }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', flex: 1, justifyContent: 'center' }}>
      <View style={{ backgroundColor: colors.purple, borderRadius: 24, padding: 22, maxHeight: '90%', width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        <Header title={title} right={<Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Icon name="close" color={colors.paper} size={20} /></Pressable>} /><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>{children}<Button title="Fechar" variant="secondary" onPress={onClose} /></ScrollView>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
export const searchMatches = (text: string, query: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase());
