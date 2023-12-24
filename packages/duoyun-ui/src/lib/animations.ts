import { themeStore } from './theme';

export const commonAnimationOptions = {
  easing: themeStore.timingFunction,
  duration: 150,
} satisfies KeyframeAnimationOptions;

export const fadeIn: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
export const fadeOut = [...fadeIn].reverse();

export const slideInUp: Keyframe[] = [
  {
    transform: 'translateY(50%)',
    opacity: 0,
  },
  {
    transform: 'translateY(0)',
    opacity: 1,
  },
];
export const slideOutDown = [...slideInUp].reverse();

export const slideInLeft: Keyframe[] = [
  {
    transform: 'translateX(50%)',
    opacity: 0,
  },
  {
    transform: 'translateX(0)',
    opacity: 1,
  },
];
export const slideOutRight = [...slideInLeft].reverse();
