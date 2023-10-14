// https://gist.github.com/gokulkrishh/242e68d1ee94ad05f488
// https://mediag.com/news/popular-screen-resolutions-designing-for-all/

const match = (query: string) => window.matchMedia(query).matches;

export const mediaQuery = {
  PRINT: 'print',
  get isPrint() {
    return match(this.PRINT);
  },

  HOVER: '(hover: hover)',
  get isHover() {
    return match(this.HOVER);
  },

  PWA: '(display-mode: standalone)',
  // PWA: '(display-mode: browser)', // debugging
  get isPWA() {
    return match(this.PWA);
  },

  MOTION_REDUCE: '(prefers-reduced-motion: reduce)',
  get isMotionReduce() {
    return match(this.MOTION_REDUCE);
  },

  DATA_REDUCE: '(prefers-reduced-data: reduce)',
  get isDataReduce() {
    return match(this.DATA_REDUCE);
  },

  WATCH: '(width < 320px)',
  get isWatch() {
    return match(this.WATCH);
  },

  SMALL_PHONE: '(320px <= width <= 480px) and (height <= 640px)',
  get isSmallPhone() {
    return match(this.SMALL_PHONE);
  },

  PHONE: '(320px <= width <= 480px)',
  get isPhone() {
    return match(this.PHONE);
  },

  PHONE_LANDSCAPE: '(480px < width < 960px) and (orientation: landscape)',
  // PHONE_LANDSCAPE: '(480px < width < 960px)',
  get isPhoneLandscape() {
    return match(this.PHONE_LANDSCAPE);
  },

  // Widget
  SHORT: '(width >= 480px) and (height <= 320px)',
  get isShort() {
    return match(this.SHORT);
  },

  // 1280 x 850
  // 1024 x 768
  TABLET: '(480px < width <= 1280px)',
  get isTablet() {
    return match(this.TABLET);
  },

  // 1366x768
  DESKTOP: '(width > 1280px) and (orientation: landscape)',
  get isDesktop() {
    return match(this.DESKTOP);
  },

  // 1920x1080
  WIDTHSCREEN: '(width >= 1920px) and (orientation: landscape)',
  get isWidthScreen() {
    return match(this.WIDTHSCREEN);
  },
};
