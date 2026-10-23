import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../styles/theme';
export type IconName = 'home' | 'chat' | 'forum' | 'content' | 'heart' | 'profile' | 'search' | 'mail' | 'lock' | 'eye' | 'eyeOff' | 'back' | 'send' | 'plus' | 'close' | 'logout' | 'check' | 'shield' | 'camera' | 'refresh' | 'trash' | 'edit' | 'flag';
const paths: Record<IconName, string> = {
  home: 'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
  chat: 'M21 11a9 9 0 0 1-9 9H4l-2 2V11a9 9 0 0 1 19 0Z',
  forum: 'M16 15H7l-5 4V4h15v11ZM18 9h4v13l-5-3h-5v-2',
  content: 'M7 3h13v18H4V3h3ZM8 7h8M8 11h8M8 15h5',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  profile: 'M4 21v-2a7 7 0 0 1 14 0v2M17 7h5M19.5 4.5v5M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  search: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  mail: 'M3 5h18v14H3V5Zm0 0 9 8 9-8',
  lock: 'M6 11h12v11H6V11Zm2 0V7a4 4 0 0 1 8 0v4M12 15v3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  eyeOff: 'M3 3l18 18M9 5.5A12 12 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3 3M6 7a23 23 0 0 0-4 5s4 7 10 7a12 12 0 0 0 5-1',
  back: 'M20 12H4m7-7-7 7 7 7',
  send: 'M22 2 9 15M22 2l-8 20-5-7-7-5 20-8Z',
  plus: 'M12 4v16M4 12h16', close: 'M5 5l14 14M19 5 5 19',
  logout: 'M9 3H3v18h6M10 12h12m-5-5 5 5-5 5',
  check: 'M4 12l5 5L20 6',
  shield: 'M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6l-9-4Zm0 5v10M7 12h10',
  camera: 'M3 7h5l2-3h4l2 3h5v14H3V7Zm13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  refresh: 'M20 7v5h-5M4 17v-5h5M20 12a8 8 0 0 0-14-5M4 12a8 8 0 0 0 14 5',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  edit: 'M16 3l5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5',
  flag: 'M5 22V3h14l-3 5 3 5H5',
};
export function Icon({ name, size = 24, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><Path d={paths[name]} /></Svg>;
}
