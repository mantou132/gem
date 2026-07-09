/**
 * Easing functions for smooth animations
 * All functions take a time parameter t (0-1) and return the eased value
 */

export type EasingFunction = (t: number) => number;

// Basic easing functions
export const linear: EasingFunction = (t) => t;

// Cubic easing (from user's original code)
export const easeInCubic: EasingFunction = (t) => t * t * t;

export const easeOutCubic: EasingFunction = (t) => 1 - (1 - t) ** 3;

export const easeInOutCubic: EasingFunction = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Quad easing
export const easeInQuad: EasingFunction = (t) => t * t;

export const easeOutQuad: EasingFunction = (t) => 1 - (1 - t) * (1 - t);

export const easeInOutQuad: EasingFunction = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Quart easing
export const easeInQuart: EasingFunction = (t) => t * t * t * t;

export const easeOutQuart: EasingFunction = (t) => 1 - (1 - t) ** 4;

export const easeInOutQuart: EasingFunction = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2);

// Quint easing
export const easeInQuint: EasingFunction = (t) => t * t * t * t * t;

export const easeOutQuint: EasingFunction = (t) => 1 - (1 - t) ** 5;

export const easeInOutQuint: EasingFunction = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - (-2 * t + 2) ** 5 / 2);

// Sine easing
export const easeInSine: EasingFunction = (t) => 1 - Math.cos((t * Math.PI) / 2);

export const easeOutSine: EasingFunction = (t) => Math.sin((t * Math.PI) / 2);

export const easeInOutSine: EasingFunction = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// Expo easing
export const easeInExpo: EasingFunction = (t) => (t === 0 ? 0 : 2 ** (10 * t - 10));

export const easeOutExpo: EasingFunction = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

export const easeInOutExpo: EasingFunction = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
};

// Circ easing
export const easeInCirc: EasingFunction = (t) => 1 - Math.sqrt(1 - t ** 2);

export const easeOutCirc: EasingFunction = (t) => Math.sqrt(1 - (t - 1) ** 2);

export const easeInOutCirc: EasingFunction = (t) =>
  t < 0.5 ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2 : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2;

// Back easing
export const easeInBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};

export const easeOutBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export const easeInOutBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return t < 0.5
    ? ((2 * t) ** 2 * ((c2 + 1) * 2 * t - c2)) / 2
    : ((2 * t - 2) ** 2 * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
};

// Elastic easing
export const easeInElastic: EasingFunction = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * c4);
};

export const easeOutElastic: EasingFunction = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const easeInOutElastic: EasingFunction = (t) => {
  const c5 = (2 * Math.PI) / 4.5;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
    : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
};

// Bounce easing
export const easeOutBounce: EasingFunction = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const easeInBounce: EasingFunction = (t) => 1 - easeOutBounce(1 - t);

export const easeInOutBounce: EasingFunction = (t) =>
  t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2;

// Easing map for easy lookup
const easingFunctions = {
  linear,
  'ease-in': easeInCubic,
  'ease-out': easeOutCubic,
  'ease-in-out': easeInOutCubic,
  'ease-in-quad': easeInQuad,
  'ease-out-quad': easeOutQuad,
  'ease-in-out-quad': easeInOutQuad,
  'ease-in-cubic': easeInCubic,
  'ease-out-cubic': easeOutCubic,
  'ease-in-out-cubic': easeInOutCubic,
  'ease-in-quart': easeInQuart,
  'ease-out-quart': easeOutQuart,
  'ease-in-out-quart': easeInOutQuart,
  'ease-in-quint': easeInQuint,
  'ease-out-quint': easeOutQuint,
  'ease-in-out-quint': easeInOutQuint,
  'ease-in-sine': easeInSine,
  'ease-out-sine': easeOutSine,
  'ease-in-out-sine': easeInOutSine,
  'ease-in-expo': easeInExpo,
  'ease-out-expo': easeOutExpo,
  'ease-in-out-expo': easeInOutExpo,
  'ease-in-circ': easeInCirc,
  'ease-out-circ': easeOutCirc,
  'ease-in-out-circ': easeInOutCirc,
  'ease-in-back': easeInBack,
  'ease-out-back': easeOutBack,
  'ease-in-out-back': easeInOutBack,
  'ease-in-elastic': easeInElastic,
  'ease-out-elastic': easeOutElastic,
  'ease-in-out-elastic': easeInOutElastic,
  'ease-in-bounce': easeInBounce,
  'ease-out-bounce': easeOutBounce,
  'ease-in-out-bounce': easeInOutBounce,
} as const;

export type EasingType = keyof typeof easingFunctions;

/**
 * Get easing function by name
 */
export function getEasing(name: EasingType) {
  return easingFunctions[name];
}
