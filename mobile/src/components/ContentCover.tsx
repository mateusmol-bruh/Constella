import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { mediaUrl } from '../utils/media';
import { colors, ui } from '../styles/theme';
export function ContentCover({ capa, titulo }: { capa?: string | null; titulo: string }) {
  const uri = mediaUrl(capa),
    [failed, setFailed] = useState<string>();
  if (!uri) return null;
  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: colors.lavender,
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'center',
      }}
    >
      {uri !== failed ? (
        <Image
          key={uri}
          accessibilityLabel={'Capa de ' + titulo}
          source={{ uri }}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
          onError={() => setFailed(uri)}
        />
      ) : (
        <Text style={ui.dark}>Capa indisponível</Text>
      )}
    </View>
  );
}
