import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { Icon } from './Icon';
import { mediaUrl } from '../utils/media';
import { colors } from '../styles/theme';

export function ForumCover({ foto, title, size = 50 }: { foto?: string | null; title: string; size?: number }) {
  const [failed, setFailed] = useState<string>();
  const uri = mediaUrl(foto);
  return <View accessibilityRole="image" accessibilityLabel={`Capa de ${title}`} style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' }}>
    {uri && uri !== failed ? <Image key={uri} source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" onError={() => setFailed(uri)} /> : <Icon name="forum" size={size * 0.55} />}
  </View>;
}
