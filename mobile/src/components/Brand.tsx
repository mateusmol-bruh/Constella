import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { logoXml } from '../constants/logo';
import { compactLogoXml } from '../constants/compact-logo';

export function Brand({ width = 250, variant = 'primary' }: { width?: number; variant?: 'primary' | 'compact' }) {
  const compact = variant === 'compact';
  return <View accessible accessibilityLabel="Constella" accessibilityRole="image" style={{ width, maxWidth: '100%', aspectRatio: compact ? 2453 / 1380 : 1775 / 521 }}>
    <SvgXml xml={compact ? compactLogoXml : logoXml} width="100%" height="100%" />
  </View>;
}

