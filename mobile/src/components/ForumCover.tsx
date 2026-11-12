import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { Icon } from './Icon';
import { mediaUrl } from '../utils/media';
import { colors } from '../styles/theme';

export function ForumCover({ foto, title, size = 50, height = size }: { foto?: string | null; title: string; size?: number; height?: number }) {
  const [failed, setFailed] = useState<string>();
  const uri = mediaUrl(foto);
  return <View accessibilityRole="image" accessibilityLabel={`Capa de ${title}`} style={{ width: size, height, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' }}>
    {uri && uri !== failed ? <Image key={uri} source={{ uri }} style={{ width: size, height }} resizeMode="cover" onError={() => setFailed(uri)} /> : <Icon name="forum" size={Math.min(size, height) * 0.55} />}
  </View>;
}
