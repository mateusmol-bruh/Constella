import React from 'react';
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { imageAuthHeaders } from '../services/api';
import { mediaUrl } from '../utils/media';
import { fitImage } from '../utils/layout';

export function ConversationImage({ uri, maxWidth, maxHeight = 300, onLongPress }: { uri: string; maxWidth: number; maxHeight?: number; onLongPress?: () => void }) {
  const [size, setSize] = React.useState({ width: 1, height: 1 });
  const [open, setOpen] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [attempt, setAttempt] = React.useState(0);
  const source = { uri: mediaUrl(uri), headers: uri.startsWith('/api/anexos/') ? imageAuthHeaders() : undefined };
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel="Ver imagem completa" onPress={() => setOpen(true)} onLongPress={onLongPress}>
      <Image key={attempt} source={source} accessibilityLabel="Imagem enviada na conversa" resizeMode="contain"
        style={{ ...fitImage(size.width, size.height, maxWidth, maxHeight), borderRadius: 10 }}
        onLoad={event => { const loaded = event.nativeEvent.source; if (loaded.width && loaded.height) setSize(loaded); setLoading(false); }}
        onError={() => { setLoading(false); setFailed(true); }} />
      {loading && <ActivityIndicator accessibilityLabel="Carregando imagem" style={{ position: 'absolute', alignSelf: 'center', top: '40%' }} />}
    </Pressable>
    {failed && <Pressable accessibilityRole="button" onPress={() => { setFailed(false); setLoading(true); setAttempt(value => value + 1); }}><Text style={{ color: '#FFFFFF', paddingVertical: 8 }}>Imagem indisponível. Toque para tentar novamente.</Text></Pressable>}
    <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#100D32' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar imagem" onPress={() => setOpen(false)} style={{ padding: 20 }}><Text style={{ color: '#FFFFFF' }}>Fechar</Text></Pressable>
        <Image source={source} accessibilityLabel="Imagem completa" style={{ flex: 1, width: '100%' }} resizeMode="contain" />
      </SafeAreaView>
    </Modal>
  </View>;
}
