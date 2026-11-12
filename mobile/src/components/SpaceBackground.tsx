import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../styles/theme';
const stars = Array.from({ length: 95 }, (_, index) => ({
  x: ((index * 73 + 19) % 360), y: ((index * 127 + 7) % 650),
  r: index % 9 === 0 ? 0.9 : 0.45, opacity: 0.15 + (index % 4) * 0.1,
}));
export function SpaceBackground({ children, waves = false }: { children: ReactNode; waves?: boolean }) {
  return <LinearGradient colors={[colors.night, '#262052', colors.purple]} locations={[0, 0.38, 1]} style={styles.fill}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 360 800" preserveAspectRatio="xMidYMid slice">
        {stars.map((star, index) => <Circle key={index} cx={star.x} cy={star.y} r={star.r} fill="white" opacity={star.opacity} />)}
        {waves && <>
          <Path d="M-30 600C80 480 50 580 120 610S60 740 180 735s230-18 220 110H-30Z" fill="#9154C7" opacity={0.28} />
          <Path d="M-30 720C140 800 30 590 100 590s120 75 105 120 60 80 190 70v80H-30Z" fill="#B25DDF" opacity={0.17} />
          <Circle cx="286" cy="630" r="15" fill="#B362D9" opacity={0.2} />
        </>}
      </Svg>
    </View>
    {children}
  </LinearGradient>;
}
const styles = StyleSheet.create({ fill: { flex: 1 } });
