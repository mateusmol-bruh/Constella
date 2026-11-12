import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../styles/theme';
import { mediaUrl } from '../utils/media';

export function Avatar({ nome, foto, size = 54 }: { nome: string; foto?: string | null; size?: number }) {
  const [failedPhoto, setFailedPhoto] = React.useState<string | null>();
  const failed = failedPhoto === foto;
  const seed = [...nome].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  const skin = ['#E7A676', '#A96240', '#F2C6A0'][seed % 3];
  const hair = ['#28213D', '#553746', '#BF7148'][seed % 3];
  return <View accessible accessibilityRole="image" accessibilityLabel={nome} style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.lavender }}>
    {foto && !failed ? <Image key={mediaUrl(foto)} source={{ uri: mediaUrl(foto) }} style={StyleSheet.absoluteFill} onError={() => setFailedPhoto(foto)} /> :
      <Svg width="100%" height="100%" viewBox="0 0 80 80">
        <Circle cx="40" cy="40" r="40" fill={['#BD9AE6', '#A9C5D8', '#EAB3D5'][seed % 3]} />
        <Path d="M15 68C10 35 18 8 39 9S72 28 66 70Z" fill={hair} />
        <Path d="M12 85V70c3-18 50-22 58 0v15Z" fill={['#6348A5', '#9D7ECD', '#5C92B8'][seed % 3]} />
        <Path d="M34 53v11q6 9 13 0V53" fill={skin} />
        <Ellipse cx="40" cy="36" rx="18" ry="23" fill={skin} />
        <Path d="M20 38Q14 10 39 10q26 0 23 29-17-6-24-18-1 13-18 17Z" fill={hair} />
        <Circle cx="33" cy="37" r="1.6" fill="#32243C" /><Circle cx="47" cy="37" r="1.6" fill="#32243C" />
        <Path d="M35 47q5 5 10-1" stroke="#A63E61" strokeWidth="2" fill="none" strokeLinecap="round" />
      </Svg>}
  </View>;
}

// Ilustração vetorial de apoio; os arquivos das ilustrações do Figma não foram fornecidos.
export function CommunityArt() {
  return <View accessible accessibilityRole="image" accessibilityLabel="Duas amigas juntas entre planetas e estrelas" style={{ width: '100%', aspectRatio: 1.05 }}>
    <Svg width="100%" height="100%" viewBox="0 0 360 340">
      <Ellipse cx="180" cy="274" rx="146" ry="30" fill="#BD8BEA" opacity=".2" />
      <Circle cx="48" cy="57" r="23" fill="#8B68BF" opacity=".4" /><Ellipse cx="48" cy="57" rx="38" ry="9" rotation="-25" origin="48,57" stroke="#CBA9ED" strokeWidth="2" opacity=".3" fill="none" />
      <Circle cx="300" cy="93" r="11" fill="#CF94D4" opacity=".4" />
      <Path d="m83 92 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm208 112 3 8 8 3-8 3-3 8-3-8-8-3 8-3ZM265 43l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#F9E6FF" opacity=".75" />
      <Path d="M77 227 161 197l121 36-91 41Z" fill="#CC9CD9" /><Path d="m77 227 114 47v35L77 263Zm114 47 91-41v34l-91 42Z" fill="#9165AE" />
      <Path d="M90 221q-23-92 18-111 45-13 51 44l-2 80Z" fill="#39273E" />
      <Path d="M106 185q-26 5-26 45l67 5 20-37-19-25Z" fill="#BA9DE0" />
      <Path d="M101 227q-5 40 9 63l21-2-5-40 35-13-6-23Z" fill="#E2C3DC" />
      <Path d="M127 229q-11 31 8 57l19-5-9-35 20-16Z" fill="#F1D7E5" />
      <Ellipse cx="128" cy="148" rx="20" ry="27" fill="#E7AF90" />
      <Path d="M103 154q-13-40 16-43 31-4 32 38-17-12-19-25-7 22-29 30Z" fill="#39273E" />
      <Circle cx="126" cy="148" r="2" fill="#352542" /><Circle cx="140" cy="147" r="2" fill="#352542" />
      <Path d="M129 160q6 5 12-1" stroke="#AE5573" strokeWidth="2" fill="none" />
      <Path d="M196 128q17-30 42-4 22 22 6 71l-52-4Z" fill="#C599DA" />
      <Path d="M194 177q-25 16-19 53l70 4q8-43-17-59Z" fill="#9EB4D6" />
      <Path d="M184 225q-12 23-14 54l19 7 17-41 32-9Z" fill="#C0AADF" />
      <Path d="M219 229q-3 30-15 54l19 8 24-45-6-20Z" fill="#D3B9E8" />
      <Ellipse cx="215" cy="151" rx="21" ry="27" fill="#EFC3AA" />
      <Path d="M190 154q-5-43 23-40 35 0 29 42-21-7-28-28-5 20-24 26Z" fill="#CB9FDE" />
      <Circle cx="206" cy="151" r="2" fill="#4A3A62" /><Circle cx="220" cy="151" r="2" fill="#4A3A62" />
      <Path d="M206 163q6 5 12-1" stroke="#B55E80" strokeWidth="2" fill="none" />
      <Path d="m156 197 27-6" stroke="#E8B59A" strokeWidth="10" strokeLinecap="round" />
      <Path d="m114 290 21-4m66 1 19 7" stroke="#F3E4ED" strokeWidth="12" strokeLinecap="round" />
    </Svg>
  </View>;
}
export function CoverArt({ kind = 0, large = false }: { kind?: number; large?: boolean }) {
  return <LinearGradient colors={kind % 2 ? ['#E5A0C5', '#B583CF'] : ['#9365C8', '#36246A']} style={{ height: large ? 195 : 132, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
    <Svg width="100%" height="100%" viewBox="0 0 300 180">
      <Circle cx="250" cy="23" r="70" fill="#F9DEF0" opacity=".15" /><Circle cx="30" cy="180" r="85" fill="#D0C6ED" opacity=".2" />
      {kind % 3 === 0 ? <>
        <Path d="M150 144 92 90q-22-34 9-51 29-16 49 11 20-27 49-11 31 17 9 51Z" fill="#F9D3D5" />
        <Path d="m145 67-21 22 15 13-12 20" stroke="#F27A8F" strokeWidth="8" fill="none" strokeLinecap="round" />
      </> : kind % 3 === 1 ? <>
        <Path d="m150 28-49 18v38c0 44 49 70 49 70s49-26 49-70V46Z" fill="#FBE4E9" />
        <Path d="M150 60v54M123 87h54" stroke="#EF8E9F" strokeWidth="15" />
      </> : <>
        <Rect x="87" y="48" width="126" height="96" rx="14" fill="#F4D7EC" />
        <Path d="M150 48v96M99 64q22-8 38 1M99 80q22-8 38 1M162 64h36M162 80h36" fill="none" stroke="#9D71BA" strokeWidth="5" />
      </>}
      <Path d="m47 42 4 10 10 4-10 4-4 10-4-10-10-4 10-4Zm199 82 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#FAE7FF" />
    </Svg>
  </LinearGradient>;
}
