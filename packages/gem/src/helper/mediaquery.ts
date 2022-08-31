// https://gist.github.com/gokulkrishh/242e68d1ee94ad05f488
// https://mediag.com/news/popular-screen-resolutions-designing-for-all/

const matche = (query: string) => window.matchMedia(query).matches;

export const mediaQuery = {
  PRINT: 'print',
  get isPrint() {
    return matche(this.PRINT);
  },
  HOVER: '(hover: hover)',
  get isHover() {
    return matche(this.HOVER);
  },

  PHONE: '(min-width: 319px) and (max-width: 480px)',
  get isPhone() {
    return matche(this.PHONE);
  },

  LAPTOP: '(min-width: 1023px) and (max-width: 1280px) and (orientation: landscape)',
  get isLaptop() {
    return matche(this.LAPTOP);
  },

  DESKTOP: '(min-width: 1279px) and (orientation: landscape)',
  get isDesktop() {
    return matche(this.DESKTOP);
  },

  WIDTHSCREEN: '(min-width: 1919px) and (orientation: landscape)',
  get isWidthScreen() {
    return matche(this.WIDTHSCREEN);
  },

  PHONE_LANDSCAPE: '(min-width: 479px) and (max-width: 959px) and (orientation: landscape)',
  // PHONE_LANDSCAPE: '(min-width: 481px) and (max-width: 959px)',
  get isPhoneLandscape() {
    return matche(this.PHONE_LANDSCAPE);
  },

  TABLET: '(min-width: 768px) and (max-width: 1024px)',
  get isTablet() {
    return matche(this.TABLET);
  },

  SMALL_PHONE: '(min-width: 319px) and (max-width: 480px) and (max-height: 640px)',
  get isSmallPhone() {
    return matche(this.SMALL_PHONE);
  },

  WATCH: '(max-width: 319px)',
  get isWatch() {
    return matche(this.WATCH);
  },

  SHORT: '(min-width: 479px) and (max-height: 320px)',
  get isShort() {
    return matche(this.SHORT);
  },

  PWA: '(display-mode: standalone)',
  // PWA: '(display-mode: browser)', // debugging
  get isPWA() {
    return matche(this.PWA);
  },

  MOTION_REDUCE: '(prefers-reduced-motion: reduce)',
  get isMotionReduce() {
    return matche(this.MOTION_REDUCE);
  },

  DATA_REDUCE: '(prefers-reduced-data: reduce)',
  get isDataReduce() {
    return matche(this.DATA_REDUCE);
  },
};
