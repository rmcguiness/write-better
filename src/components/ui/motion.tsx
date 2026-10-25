import { useEffect, useState } from 'react';
import { Platform, Pressable, View, type PressableProps, type ViewProps } from 'react-native';
import Animated, { FadeInDown, LinearTransition, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

export function useMotionPreference() {
  const systemReduced = useReducedMotion();
  const [webReduced, setWebReduced] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setWebReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return systemReduced || webReduced;
}

export function MotionView(props: ViewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Static HTML must stay visible before the browser's motion preference is known.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const reduced = useMotionPreference();
  if (!mounted || reduced) return <View {...props} />;
  return <Animated.View entering={reduced ? undefined : FadeInDown.duration(240).reduceMotion(ReduceMotion.System)} layout={reduced ? undefined : LinearTransition.duration(220).reduceMotion(ReduceMotion.System)} {...props} />;
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function MotionPressable({ style, onPressIn, onPressOut, ...props }: PressableProps) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const reduced = useMotionPreference();
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <AnimatedPressable {...props} style={[typeof style === 'function' ? style({ pressed, hovered: false }) : style, motion]}
    onPressIn={(e) => { setPressed(true); scale.set(reduced ? 1 : withTiming(0.98, { duration: 100, reduceMotion: ReduceMotion.System })); onPressIn?.(e); }}
    onPressOut={(e) => { setPressed(false); scale.set(reduced ? 1 : withTiming(1, { duration: 160, reduceMotion: ReduceMotion.System })); onPressOut?.(e); }} />;
}
export function ProgressFill({ progress, color }: { progress: number; color: string }) {
  const value = useSharedValue(0);
  const reduced = useMotionPreference();
  useEffect(() => { value.value = reduced ? progress : withTiming(progress, { duration: 450, reduceMotion: ReduceMotion.System }); }, [progress, reduced, value]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, value.value)) * 100}%` as `${number}%` }));
  return <Animated.View style={[{ height: '100%', backgroundColor: color, borderRadius: 4 }, style]} />;
}
