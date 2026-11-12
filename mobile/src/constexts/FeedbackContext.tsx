import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Keyboard, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../components/Icon';
import { colors, fontFamily } from '../styles/theme';

export type FeedbackKind = 'success' | 'error' | 'warning' | 'info';
type Feedback = (message: string, kind?: FeedbackKind) => void;
const FeedbackContext = createContext<Feedback>(() => {});
const appearance: Record<FeedbackKind, { icon: IconName; accent: string }> = {
  success: { icon: 'check', accent: '#83D4B4' }, error: { icon: 'close', accent: '#F3A0B5' },
  warning: { icon: 'flag', accent: '#EAC98E' }, info: { icon: 'chat', accent: '#C3A4EB' },
};
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: FeedbackKind }>();
  const [keyboard, setKeyboard] = useState(0);
  const [animation] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sequence = useRef(0);
  const reducedMotion = useRef(false);
  const insets = useSafeAreaInsets();
  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    const version = ++sequence.current;
    Animated.timing(animation, { toValue: 0, duration: reducedMotion.current ? 0 : 140, useNativeDriver: true }).start(() => {
      if (version === sequence.current) setToast(undefined);
    });
  }, [animation]);
  const notify = useCallback<Feedback>((message, kind = 'success') => {
    clearTimeout(timer.current); sequence.current++;
    animation.stopAnimation(); animation.setValue(0);
    setToast({ message, kind });
    Animated.timing(animation, { toValue: 1, duration: reducedMotion.current ? 0 : 180, useNativeDriver: true }).start();
    timer.current = setTimeout(dismiss, kind === 'error' ? 4200 : 3000);
  }, [animation, dismiss]);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) reducedMotion.current = value; });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reducedMotion.current = value; });
    const show = Keyboard.addListener('keyboardDidShow', event => setKeyboard(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => { active = false; clearTimeout(timer.current); motion.remove(); show.remove(); hide.remove(); };
  }, []);
  return <FeedbackContext.Provider value={notify}>
    <View style={{ flex: 1 }}>{children}
      {toast && <Animated.View pointerEvents="box-none" style={{ position: 'absolute', bottom: keyboard ? keyboard + 12 : insets.bottom + 82, left: 16, right: 16, zIndex: 100, opacity: animation, transform: [{ translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
        <Pressable accessibilityRole="alert" accessibilityLiveRegion={toast.kind === 'error' ? 'assertive' : 'polite'} accessibilityLabel={toast.message + '. Toque para fechar.'} onPress={dismiss} style={{ width: '100%', maxWidth: 480, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF24', backgroundColor: colors.night, elevation: 6 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF10', alignItems: 'center', justifyContent: 'center' }}><Icon name={appearance[toast.kind].icon} size={17} color={appearance[toast.kind].accent} /></View>
          <Text style={{ flex: 1, minWidth: 0, fontFamily, color: colors.paper, fontSize: 14, lineHeight: 20 }}>{toast.message}</Text>
          <Icon name="close" color={colors.muted} size={15} />
        </Pressable>
      </Animated.View>}
    </View>
  </FeedbackContext.Provider>;
}
export const useFeedback = () => useContext(FeedbackContext);
