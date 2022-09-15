import { themeStore } from './theme';

export const commonAnimationOptions: KeyframeAnimationOptions = {
  easing: themeStore.timingFunction,
  duration: 300,
};

export const fadeIn: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
export const fadeOut: Keyframe[] = [{ opacity: 1 }, { opacity: 0 }];
