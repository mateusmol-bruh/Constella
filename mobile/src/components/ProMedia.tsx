import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { api, apiUrl, errorMessage, imageAuthHeaders } from '../services/api';
import type { ProMediaFile } from '../types/pro';
import { ConversationImage } from './ConversationImage';
import { Button } from './ui';
import { colors, ui } from '../styles/theme';
function usePrivateSource(file: ProMediaFile) {
  const [uri, setUri] = useState<string>(),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true,
      url: string | undefined;
    const controller = new AbortController();
    setUri(undefined);
    setError('');
    if (
      !/^\/api\/pro\/conteudos\/[1-9]\d*\/midias\/[a-f0-9-]{36}$/.test(file.url)
    ) {
      setError('Arquivo indisponível.');
      return;
    }
    if (Platform.OS !== 'web') {
      setUri(apiUrl + file.url);
      return;
    }
    // Web video/image elements cannot attach Bearer headers. Fetch with the authenticated client.
    void api
      .get<Blob>(file.url, {
        responseType: 'blob',
        timeout: 120000,
        signal: controller.signal,
      })
      .then((r) => {
        if (active) {
          url = URL.createObjectURL(r.data);
          setUri(url);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.url, attempt]);
  return { uri, error, retry: () => setAttempt((v) => v + 1) };
}
function Player({ uri, file }: { uri: string; file: ProMediaFile }) {
  const player = useVideoPlayer({
      uri,
      headers: Platform.OS === 'web' ? undefined : imageAuthHeaders(),
      useCaching: false,
    }),
    [error, setError] = useState('');
  useEffect(() => {
    const listener = player.addListener('statusChange', (event) => {
      if (event.status === 'error')
        setError(
          'Não foi possível reproduzir este vídeo. Confira sua conexão e tente novamente.',
        );
      else setError('');
    });
    return () => listener.remove();
  }, [player]);
  useFocusEffect(
    useCallback(
      () => () => {
        player.pause();
      },
      [player],
    ),
  );
  return (
    <View style={{ gap: 10 }}>
      <VideoView
        player={player}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        style={{
          width: '100%',
          aspectRatio: file.largura / file.altura,
          maxHeight: 440,
          backgroundColor: '#100D32',
          borderRadius: 12,
        }}
        accessibilityLabel="Vídeo exclusivo PRO"
      />
      {!!error && (
        <>
          <Text style={ui.body}>{error}</Text>
          <Button
            title="Tentar reproduzir novamente"
            onPress={() =>
              void player
                .replaceAsync({
                  uri,
                  headers:
                    Platform.OS === 'web' ? undefined : imageAuthHeaders(),
                  useCaching: false,
                })
                .catch(() =>
                  setError(
                    'Não foi possível reproduzir este vídeo. Tente novamente.',
                  ),
                )
            }
          />
        </>
      )}
    </View>
  );
}
export function ProMedia({ file }: { file: ProMediaFile }) {
  const source = usePrivateSource(file),
    { width } = useWindowDimensions();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...ui.muted, color: colors.pink }}>
        {file.tipo === 'video' ? 'Vídeo exclusivo' : 'Imagem exclusiva'}
      </Text>
      {source.error ? (
        <>
          <Text style={ui.body}>{source.error}</Text>
          <Button
            title="Tentar carregar arquivo novamente"
            onPress={source.retry}
          />
        </>
      ) : !source.uri ? (
        <ActivityIndicator accessibilityLabel="Carregando arquivo PRO" />
      ) : file.tipo === 'video' ? (
        <Player uri={source.uri} file={file} />
      ) : (
        <ConversationImage
          uri={Platform.OS === 'web' ? source.uri : file.url}
          maxWidth={Math.max(120, Math.min(width - 80, 560))}
          maxHeight={420}
          accessibilityLabel="Imagem exclusiva PRO"
        />
      )}
    </View>
  );
}
