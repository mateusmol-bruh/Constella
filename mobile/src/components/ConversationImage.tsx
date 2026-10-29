import React from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, imageAuthHeaders } from '../services/api';
import { mediaUrl } from '../utils/media';
import { fitImage } from '../utils/layout';

export function ConversationImage({
  uri,
  maxWidth,
  maxHeight = 300,
  onLongPress,
  accessibilityLabel = 'Imagem enviada na conversa',
}: {
  uri: string;
  maxWidth: number;
  maxHeight?: number;
  onLongPress?: () => void;
  accessibilityLabel?: string;
}) {
  const [size, setSize] = React.useState({ width: 1, height: 1 });
  const [open, setOpen] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [attempt, setAttempt] = React.useState(0);
  const privateFile =
    uri.startsWith('/api/anexos/') || uri.startsWith('/api/pro/');
  const [webUri, setWebUri] = React.useState<string>();
  React.useEffect(() => {
    setFailed(false);
    setLoading(true);
    if (Platform.OS !== 'web' || !privateFile) return;
    let active = true,
      url: string | undefined;
    const controller = new AbortController();
    setWebUri(undefined);
    void api
      .get<Blob>(uri, { responseType: 'blob', signal: controller.signal })
      .then((response) => {
        if (active) {
          url = URL.createObjectURL(response.data);
          setWebUri(url);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setFailed(true);
        }
      });
    return () => {
      active = false;
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [uri, privateFile, attempt]);
  const source = {
    uri: Platform.OS === 'web' && privateFile ? webUri : mediaUrl(uri),
    headers:
      privateFile && Platform.OS !== 'web' ? imageAuthHeaders() : undefined,
  };
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver imagem completa"
        onPress={() => setOpen(true)}
        onLongPress={onLongPress}
      >
        <Image
          key={attempt}
          source={source}
          accessibilityLabel={accessibilityLabel}
          resizeMode="contain"
          style={{
            ...fitImage(size.width, size.height, maxWidth, maxHeight),
            borderRadius: 10,
          }}
          onLoad={(event) => {
            // React Native Web fornece um evento DOM em nativeEvent, sem source.
            const loaded = event.nativeEvent as unknown as {
              source?: { width: number; height: number };
              target?: { naturalWidth?: number; naturalHeight?: number };
            };
            const width = loaded?.source?.width ?? loaded?.target?.naturalWidth;
            const height =
              loaded?.source?.height ?? loaded?.target?.naturalHeight;
            if (width && height) setSize({ width, height });
            setLoading(false);
          }}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
        {loading && (
          <ActivityIndicator
            accessibilityLabel="Carregando imagem"
            style={{ position: 'absolute', alignSelf: 'center', top: '40%' }}
          />
        )}
      </Pressable>
      {failed && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setFailed(false);
            setLoading(true);
            setAttempt((value) => value + 1);
          }}
        >
          <Text style={{ color: '#FFFFFF', paddingVertical: 8 }}>
            Imagem indisponível. Toque para tentar novamente.
          </Text>
        </Pressable>
      )}
      <Modal
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#100D32' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar imagem"
            onPress={() => setOpen(false)}
            style={{ padding: 20 }}
          >
            <Text style={{ color: '#FFFFFF' }}>Fechar</Text>
          </Pressable>
          <Image
            source={source}
            accessibilityLabel="Imagem completa"
            style={{ flex: 1, width: '100%' }}
            resizeMode="contain"
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
