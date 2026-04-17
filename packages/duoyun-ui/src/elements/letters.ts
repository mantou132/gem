import {
  adoptedStyle,
  attribute,
  boolattribute,
  customElement,
  type Emitter,
  effect,
  emitter,
  memo,
  numattribute,
  shadow,
} from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, svg } from '@mantou/gem/lib/element';
import { randomStr } from '@mantou/gem/lib/utils';

import { type EasingType, getEasing } from '../lib/easing';
import { clamp } from '../lib/number';

const style = css`
  :host {
    display: inline-block;
    line-height: 1;
  }

  svg {
    display: block;
    height: 4em;
    overflow: visible;
  }
`;

type LetterShape = {
  d: string;
  length?: number;
  dot?: { cx: number; cy: number; r: number };
};

type LetterData = {
  width: number;
  paths: LetterShape[];
};

const LETTERS: Record<string, LetterData> = {
  a: {
    width: 18,
    paths: [
      {
        d: 'M 9.0039 2.9991 C 8.2089 1.4091 7.8711 0.4659 6.0039 -0.0009 C 0.5166 -1.3727 -2.6187 7.5935 3.0039 8.9991 C 5.6538 9.6616 7.1841 8.1853 8.0039 5.9991 C 8.7539 3.9991 9.7539 0.2491 10.0039 -0.0009 C 10.2539 -0.2509 9.2539 2.9991 9.0039 4.9991 C 8.8263 6.4198 8.7357 9.7552 11.0039 8.9991 C 13.5611 8.1467 14.5827 6.1309 16.0039 3.9991',
        length: 49.4736213684082,
      },
    ],
  },
  b: {
    width: 16,
    paths: [
      {
        d: 'M 0 3.798 C 2.1153 0.625 4.5767 -2.6439 6 -6.202 C 6.3998 -7.2016 8.4714 -12.202 6 -12.202 C 0.862 -12.202 1.2427 -1.3572 1 1.798 C 0.9082 2.9916 -0.0933 9.4016 2.5407 8.992 C 3.8124 8.7942 5.9689 6.8354 7.5327 4.6805 C 9.0922 2.5315 10.0633 0.1861 8.2477 0.1861 C 6.2253 0.1861 8.483 4.4943 10 5 C 11.5342 5.5114 12.6883 4.6558 14 4',
        length: 65.60415649414062,
      },
    ],
  },
  c: {
    width: 13,
    paths: [
      {
        d: 'M 7 1.9986 C 7 1.7486 7.25 1.4986 7 0.9986 C 4.7595 -3.4824 -2.6729 4.3257 1 7.9986 C 3.2512 10.2498 7.0176 8.981 9 6.9986 C 10.25 5.7486 10.5 4.7486 11 3.9986',
        length: 27.196636199951172,
      },
    ],
  },
  d: {
    width: 18,
    paths: [
      {
        d: 'M 9 2.9825 C 7.9678 0.918 6.4434 -0.6284 4 -0.0175 C -1.6406 1.3926 -0.3435 11.4113 5 8.9825 C 10.5 6.4825 12.3186 -6.9733 14 -12.0175',
        length: 44.06877136230469,
      },
      {
        d: 'M 14 -12.0175 C 14.5 -13.5175 11.75 -3.7675 10.5 0.4825',
        length: 13.314582824707031,
      },
      {
        d: 'M 10.8838 -0.8583 C 10.1991 1.4695 6.8527 7.4088 10 8.9825 C 12.5144 10.2397 15.0502 5.4072 16 3.9825',
        length: 19.16524314880371,
      },
    ],
  },
  e: {
    width: 12,
    paths: [
      {
        d: 'M 1 7 C 2.8515 6.0743 4.4647 5.141 5 3 C 5.679 0.2838 3.1044 -1.1044 1 1 C -0.673 2.6729 -0.6662 6.3338 1 8 C 4.4052 11.4052 8.1801 6.7299 10 4',
        length: 31.54142951965332,
      },
    ],
  },
  f: {
    width: 13,
    paths: [
      {
        d: 'M 0 4 C 3.1472 0.066 6.9758 -3.879 8 -9 C 8.8504 -13.2521 4.8057 -11.6855 4 -9 C 2.2947 -3.3156 1.0947 2.4143 -1 8 C -2.5 12 -3 12.5 -4 15 C -4.4002 16.0006 -6.4727 21 -4 21 C 0.5634 21 -0.6931 10.7725 0 8 C 0.5 6 0.25 8.75 1 9 C 4.2993 10.0998 6.5041 6.2439 8 4',
        length: 81.80183410644531,
      },
    ],
  },
  g: {
    width: 17,
    paths: [
      {
        d: 'M 9 3 C 7.4291 -0.1419 3.0973 -1.1459 1 2 C -2.0686 6.6029 2.8988 10.7342 7 8 C 7.75 7.5 7.75 7.25 8 7',
        length: 23.684032440185547,
      },
      {
        d: 'M 8 7 C 8.75 5 10 0 10 0',
        length: 7.282601356506348,
      },
      {
        d: 'M 10 0 C 8.9369 5.3156 6.2026 20.3955 1.9875 20.9539 C -1.3584 21.3972 -0.8492 17.7379 0.3283 15.3652 C 2.4303 11.1302 8.8308 9.8665 11.9765 7.2451 C 13.5347 5.9466 14.25 4.75 15 4',
        length: 49.44695281982422,
      },
    ],
  },
  h: {
    width: 17,
    paths: [
      {
        d: 'M 0 4 C 0.5 3.25 0.75 3 2 1 C 2.6014 0.0377 10.5999 -12 6 -12 C 2.8115 -12 2.4422 -7.2109 2 -5 C 1.5 -2.5 1.5 -2.5 1 1 C 0.5 4.5 0.25 7 0 9',
        length: 41.71580123901367,
      },
      {
        d: 'M 0 9 C -0.25 11 -0.25 9.75 0 9 Z',
        length: 2.1996209621429443,
      },
      {
        d: 'M 0 8.9999 C 0.25 8.2499 0.5 7.2499 1 5.9999 C 1.6941 4.2646 2.6744 2.3255 4 0.9999 C 4.9852 0.0147 6.6474 -0.4509 8 -0.0001 C 9.3237 0.4412 9.233 1.835 9 2.9999 C 8.666 4.67 7.3333 5.9999 8 7.9999 C 8.3018 8.9054 9.4082 9.8752 10.5341 9.6294 C 13.3199 9.0212 14.0878 6.3773 15 3.9999',
        length: 32.90616226196289,
      },
    ],
  },
  i: {
    width: 9,
    paths: [
      {
        d: 'M 0 4 C 0.5 3 2.1263 -0.4838 2 0 C 1.334 2.5499 -0.9031 5.4005 0 8.1097 C 0.3018 9.0151 1.3897 9.2642 2.2294 8.9843 C 4.7764 8.1353 5.5954 6.1069 7 4',
        length: 22.817523956298828,
      },
      {
        d: '',
        dot: {
          cx: 3.9,
          cy: -4.8,
          r: 1.6,
        },
      },
    ],
  },
  j: {
    width: 10,
    paths: [
      {
        d: 'M 0 4 C 0.4175 2.7301 2.1782 -1.0951 2.1782 -1.0951 C 2.1782 4.3228 -2.421 17.5904 -4.9256 20.0949 C -8.242 23.4113 -9.3306 17.5343 -7.7792 15.2073 C -6.2279 12.8802 -2.9875 11.5915 -0.7665 10.2589 C 2.2997 8.4191 4.4712 6.5288 7 4',
        length: 55.70965576171875,
      },
      {
        d: '',
        dot: {
          cx: 3.9,
          cy: -5.1,
          r: 1.6,
        },
      },
    ],
  },
  k: {
    width: 16,
    paths: [
      {
        d: 'M 0 4 C 2.6686 -0.0029 6.0314 -4.157 7 -9 C 7.1804 -9.902 7.3939 -12 6 -12 C 1.7542 -12 1.455 -2.1847 1 1 C 0.5 4.5 0.25 7 0 9',
        length: 41.423431396484375,
      },
      {
        d: 'M 0 9 C -0.25 11 -0.25 9.75 0 9 Z',
        length: 2.1996209621429443,
      },
      {
        d: 'M 0 9 C 1.0582 5.8254 3.1962 -1.6013 8 0 C 9.0987 0.3662 9.6671 1.9993 9 3 C 7.9652 4.5522 5.5691 4 4 4',
        length: 22.35283088684082,
      },
      {
        d: 'M 4 4 C 3.5 3.75 3.25 4 4 4 Z',
        length: 0.9947125315666199,
      },
      {
        d: 'M 4 4 C 4.5 4.25 5.25 4 6 5 C 6.9578 6.2771 6.4222 8.2111 8 9 C 10.5526 10.2763 12.931 5.6035 14 4',
        length: 15.403361320495605,
      },
    ],
  },
  l: {
    width: 10,
    paths: [
      {
        d: 'M 0 4 C 2.1153 0.827 4.5767 -2.4419 6 -6 C 6.3998 -6.9996 8.4714 -12 6 -12 C 0.862 -12 1.2427 -1.1552 1 2 C 0.9082 3.1936 -0.0933 9.6036 2.5407 9.194 C 4.4865 8.8914 7.5818 5.5097 8 4',
        length: 50.603660583496094,
      },
    ],
  },
  m: {
    width: 27,
    paths: [
      {
        d: 'M 0 4 C 0.9939 2.5091 1.8774 0 4 0 C 6.705 0 3.3549 7.9353 3 9',
        length: 15.819231033325195,
      },
      {
        d: 'M 3 9 C 3 9 3.5 7.25 4 6',
        length: 3.1633687019348145,
      },
      {
        d: 'M 4 6 C 5.0651 3.3372 7.3954 -1.2015 11 0 C 13.7167 0.9056 10.6429 7.0714 10 9',
        length: 19.986684799194336,
      },
      {
        d: 'M 10 9 C 10 9 10.5 7.25 11 6',
        length: 3.163369655609131,
      },
      {
        d: 'M 11 6 C 11.9826 3.5434 13.2786 0.6803 16 0 C 18.3824 -0.5956 19.4268 0.8658 19 3 C 18.6327 4.8364 16.6202 7.8101 19 9 C 21.5526 10.2763 23.931 5.6035 25 4',
        length: 28.630943298339844,
      },
    ],
  },
  n: {
    width: 20,
    paths: [
      {
        d: 'M 0 4 C 0.9939 2.5091 1.8774 0 4 0 C 6.705 0 3.3549 7.9353 3 9',
        length: 15.819231033325195,
      },
      {
        d: 'M 3 9 C 3 9 3.5 7.25 4 6',
        length: 3.1633687019348145,
      },
      {
        d: 'M 4 6 C 4.9826 3.5434 6.2786 0.6803 9 0 C 11.3824 -0.5956 12.4268 0.8658 12 3 C 11.6327 4.8364 9.6202 7.8101 12 9 C 14.5143 10.2571 17.0502 5.4247 18 4',
        length: 28.604360580444336,
      },
    ],
  },
  o: {
    width: 16,
    paths: [
      {
        d: 'M 6.1786 0.2242 C -2.4358 -2.9299 -2.2245 11.7285 6.1786 8.8452 C 10.8917 7.228 10.0536 2.7604 6.5038 0.3938',
        length: 29.717954635620117,
      },
      {
        d: 'M 4.8615 0.4579 C 3.5824 7.1609 10.6724 7.7432 13.9656 3.9828',
        length: 14.051865577697754,
      },
    ],
  },
  p: {
    width: 16,
    paths: [
      {
        d: 'M 0 4 C 0.5 3.25 1.3654 2.0149 2 0.7025 C 3.9433 -3.3162 2.9453 0.029 2 3 C 0.25 8.5 -2.5 16.5 -4 21',
        length: 29.31200408935547,
      },
      {
        d: 'M -4 21 C -4 21 0.25 8 2 3',
        length: 18.9738712310791,
      },
      {
        d: 'M 2 3 C 3.7902 -2.1147 11.4067 -0.1266 10.1803 4.7789 C 9.6451 6.9199 8.8334 8.6391 5.1046 9.2304',
        length: 20.060104370117188,
      },
      {
        d: 'M 7.5193 8.8362 C 3.5934 10.0682 1.6879 8.1956 0.9159 7.5878',
        length: 7.075224876403809,
      },
      {
        d: 'M 1.1623 7.6699 C 4.1026 10.6103 9.589 9.099 12 7 C 13.2074 5.9489 14.25 4.75 15 4',
        length: 16.03578758239746,
      },
    ],
  },
  q: {
    width: 16,
    paths: [
      {
        d: 'M 9 3 C 6.8578 -1.2843 1.0871 -0.3486 0 4 C -0.7651 7.0604 2.0402 9.74 5 9 C 6 8.75 6.5 8.25 7 8',
        length: 22.64861297607422,
      },
      {
        d: 'M 7 8 C 8.25 5.75 9.5 1.25 10 0',
        length: 8.553908348083496,
      },
      {
        d: 'M 10 0 C 10.5 -1.25 9.75 1 9 3 C 8.25 5 8.25 5 7 8 C 5.6466 11.2481 3.5423 14.5696 2.8484 18.039 C 2.391 20.3261 4.3643 22.0221 6.3261 20.1792 C 9.9839 16.743 4.3948 11.0653 8.3771 8.6759 C 9.6271 7.9259 10.9195 8.2911 12.4195 7.0411 C 13.9195 5.7911 14.3813 5.2279 15 4',
        length: 46.96878433227539,
      },
    ],
  },
  r: {
    width: 14,
    paths: [
      {
        d: 'M 0 3.8999 C 0.3758 3.3362 3 -1.1001 3 -1.1001 C 3 -1.1001 2.3641 0.2923 3.1141 0.7923 C 3.8641 1.2923 5.1138 0.2678 6.1311 0.8963 C 9.3978 2.9146 3 6.8885 6.5955 8.9657 C 8.9999 10.3548 11.8533 8.3815 13 3.8999',
        length: 29.673187255859375,
      },
    ],
  },
  s: {
    width: 13,
    paths: [
      {
        d: 'M 0 4 C 0.5 3.25 1.25 2.25 2 1 C 2.75 -0.25 2.75 -1 3 -1 C 3.25 -1 2.5 -0.25 3 1 C 3.7156 2.789 8.7113 4.2604 6.4492 7.3234 C 5.9137 8.0485 4.3082 8.9242 3.8082 9.1742',
        length: 19.305953979492188,
      },
      {
        d: 'M 4.0344 9.2262 C 2.6036 9.3038 0.602 9.0242 -0.1107 8.0167',
        length: 4.468454837799072,
      },
      {
        d: 'M -0.1244 8.0162 C 1.1793 9.5485 4.2533 9.2911 6 9 C 8.5592 8.5735 9.7011 5.9482 11 4',
        length: 13.758770942687988,
      },
    ],
  },
  t: {
    width: 13,
    paths: [
      {
        d: 'M -0.3363 4.3313 C 1.6735 1.5264 1 2.75 2 1 C 3 -0.75 3.5 -2 4 -3',
        length: 8.548042297363281,
      },
      {
        d: 'M 4 -3 C 5.25 -6.25 7.75 -14.25 7 -12',
        length: 10.321630477905273,
      },
      {
        d: 'M 7.0006 -12 C 6.2506 -9.75 2.5006 1 1.0006 6 C -0.1668 9.8915 4.0594 9.2305 5.3314 8.5458 C 6.17 8.0943 11.5921 5.2758 7.4842 2.2896',
        length: 34.38968276977539,
      },
      {
        d: 'M 9.0061 3.9337 C 7.2834 0.8638 -0.2591 -0.8982 0.9668 -4.1939',
        length: 12.052918434143066,
      },
      {
        d: 'M 1 -4 C 0.75 -6 6.25 -4 8 -4',
        length: 7.609127521514893,
      },
    ],
  },
  u: {
    width: 17,
    paths: [
      {
        d: 'M 0 4 C 0.5 3 2 -0.5 2 0 C 2 0.5 0.5 4 0 6 C -0.5 8 -0.25 7.25 0 8 C 0.25 8.75 0.25 8.75 1 9 C 1.75 9.25 2 9.25 3 9 C 4 8.75 4 8.75 5 8 C 6 7.25 6 7.25 7 6 C 8 4.75 8.5 3.75 9 3',
        length: 25.291784286499023,
      },
      {
        d: 'M 9 3 C 9.75 1.5 10.25 -0.75 10 0',
        length: 3.4970192909240723,
      },
      {
        d: 'M 10 0 C 9.75 0.75 8.5 4 8 6 C 7.5 8 7.75 7.25 8 8 C 8.25 8.75 8.5 8.75 9 9 C 9.5 9.25 9.25 9.25 10 9 C 10.75 8.75 11.25 8.5 12 8 C 12.75 7.5 12.25 8 13 7 C 13.75 6 14.5 4.75 15 4',
        length: 18.281728744506836,
      },
      {
        d: 'M -0.7776 5.1197 C 1.2292 1.8587 2 0 2 0 C 2 0 -2.9329 10.4837 3 9.0004 C 5.9454 8.264 7.5236 5.7749 8.9482 2.9835',
        length: 26.177248001098633,
      },
      {
        d: 'M 8.8231 3.3683 C 9.5739 1.7225 10.0936 -0.1545 10.0936 -0.1545',
        length: 3.7480716705322266,
      },
      {
        d: 'M 10 0 C 9.75 0.75 8.5 4 8 6 C 7.1902 9.2391 9.9293 9.4788 11.8228 8.2532 C 13.2415 7.3349 14.0887 5.367 15 4',
        length: 18.00334358215332,
      },
    ],
  },
  v: {
    width: 17,
    paths: [
      {
        d: 'M -0.3577 4.3386 C 1.3136 1.7883 1.75 -0.25 2 0 C 2.25 0.25 1.25 3 1 5 C 0.8731 6.0151 0.683 7.7297 1.3136 8.5776 C 2.2528 9.8403 3.7215 8.9009 4.7028 8.2947 C 7.2263 6.7357 9 3.6926 9 0',
        length: 27.360986709594727,
      },
      {
        d: 'M 9 0 C 9 -0.75 8.75 -1 9 0 Z',
        length: 1.3492931127548218,
      },
      {
        d: 'M 9 0 C 9.5081 2.0322 9.6621 5.1039 11.5908 5.4833 C 12.92 5.7448 14.0407 4.7604 15 4',
        length: 10.244468688964844,
      },
    ],
  },
  w: {
    width: 23,
    paths: [
      {
        d: 'M 3 0 C 0.9283 2.0717 -2.5959 10.399 3 9 C 4.7651 8.5587 5.7661 7.2339 7 6',
        length: 17.252809524536133,
      },
      {
        d: 'M 7 6 C 7.9611 3.0045 9 0 9 0',
        length: 6.324662685394287,
      },
      {
        d: 'M 9 0 C 8.3322 2.5233 4.3776 10.4056 10 9 C 14.364 7.909 15 3.7507 15 0',
        length: 22.97422218322754,
      },
      {
        d: 'M 15 0 C 15.3743 4.4165 16.9665 6.0168 21 4',
        length: 9.450828552246094,
      },
    ],
  },
  x: {
    width: 18,
    paths: [
      {
        d: 'M 0 4 C 9.6288 -10.4432 4.5331 21.2004 16 4',
        length: 25.50139617919922,
      },
      {
        d: 'M 16 4 C 14.8812 2.7639 14.0373 1.9578 13 1',
        length: 4.244316101074219,
      },
      {
        d: 'M 13 1 C 6.9768 -5.0232 7.0352 14.0352 1 8',
        length: 17.783966064453125,
      },
    ],
  },
  y: {
    width: 17,
    paths: [
      {
        d: 'M -0.0076 4.0471 C 1.3036 1.1422 2 -0.5 2 0 C 2 1.9551 -2.4373 7.8542 1 9 C 4.7309 10.2436 7.3793 5.4311 9 3',
        length: 25.500415802001953,
      },
      {
        d: 'M 8.0829 4.7682 C 9.683 1.2884 10.1696 -0.597 10.4551 -1.3918',
        length: 6.605849266052246,
      },
      {
        d: 'M 10 0 C 8.1916 5.4251 6.2222 21 1 21 C -1.3622 21 -0.616 17.1305 1 15 C 3.9312 11.1356 8.6824 10.3502 12.2149 7.4064 C 13.7149 6.1564 14.4431 4.9188 15 4',
        length: 49.0269889831543,
      },
    ],
  },
  z: {
    width: 15,
    paths: [
      {
        d: 'M 0.0028 4 C 0.5028 3.25 1.0028 2 2.0028 1 C 3.9214 -0.9186 6.7854 -0.4348 8.0028 1.9999 C 9.8073 5.609 4.522 8.663 1.6491 8.9876 C 4.6582 9.4799 5.3256 12.0727 5.088 14.83 C 4.3389 23.5221 -3.3746 21.566 1.0028 15 C 2.7773 12.3381 5.7478 10.6898 8.4577 8.8827 C 9.3519 8.2865 10.2177 7.6729 11.0028 7 C 12.7528 5.5 13.2528 4.75 14.0028 4',
        length: 60.7710075378418,
      },
    ],
  },
};

const DOT_LENGTH = 4;

type SegmentInfo = {
  globalOffset: number;
  length: number;
  kind: 'path' | 'dot';
};

type CharLayout = {
  char: string;
  x: number;
  segments: SegmentInfo[];
};

type Layout = {
  chars: CharLayout[];
  totalLength: number;
  width: number;
};

function buildLayout(text: string, strokeWidth: number): Layout {
  const padding = strokeWidth * 2;
  let x = padding;
  let globalOffset = 0;
  const chars: CharLayout[] = [];

  for (const char of [...text]) {
    const letter = LETTERS[char.toLowerCase()];
    if (!letter) {
      x += 8;
      continue;
    }

    const segments: SegmentInfo[] = [];

    for (const shape of letter.paths) {
      if (shape.dot) {
        segments.push({ globalOffset, length: DOT_LENGTH, kind: 'dot' });
        globalOffset += DOT_LENGTH;
      } else if (shape.d) {
        const len = shape.length!;
        segments.push({ globalOffset, length: len, kind: 'path' });
        globalOffset += len;
      }
    }

    chars.push({ char, x, segments });
    x += letter.width - 2;
  }

  return { chars, totalLength: globalOffset, width: x + padding };
}

@customElement('dy-letters')
@adoptedStyle(style)
@shadow()
export class DuoyunLettersElement extends GemElement {
  @attribute text: string;
  @attribute colors: string;
  @numattribute strokeWidth: number;
  @numattribute duration: number;
  @attribute easing: EasingType;
  @boolattribute autoplay: boolean;
  @emitter finished: Emitter;
  @emitter elapse: Emitter<number>;

  #gradientId = `letters-fill-${randomStr()}`;
  #maskId = `letters-mask-${randomStr()}`;

  #state = createState({
    // 缓动函数计算后的动画进度
    progress: 0,
  });

  #raf = 0;
  #prevTickTime = 0;
  #elapsed = 0;
  #running = false;

  get #strokeWidth() {
    return this.strokeWidth || 2;
  }

  get #duration() {
    return this.duration || 1500;
  }

  get #easingFn() {
    return getEasing(this.easing || 'linear');
  }

  get #colors() {
    const color = this.colors || 'currentColor';
    const colors = color
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    return colors.length < 2 ? [color, color] : colors;
  }

  @memo((e) => [e.text, e.#strokeWidth])
  get layout() {
    return buildLayout(this.text, this.#strokeWidth);
  }

  get playing() {
    return this.#running;
  }

  #tick = (ts: number) => {
    if (!this.#running) return;

    const elapsed = ts - this.#prevTickTime + this.#elapsed;
    const t = elapsed / this.#duration;
    this.#state({ progress: this.#easingFn(t) });
    if (t < 1) {
      this.#raf = requestAnimationFrame(this.#tick);
      this.elapse(t);
    } else {
      this.#running = false;
      this.finished(null);
      this.elapse(1);
    }
  };

  play = () => {
    cancelAnimationFrame(this.#raf);
    this.#elapsed = 0;
    this.#running = true;
    this.#state({ progress: 0 });
    this.elapse(0);
    this.#raf = requestAnimationFrame((ts) => {
      this.#prevTickTime = ts;
      this.#tick(ts);
    });
  };

  pause = () => {
    if (!this.#running) return;
    this.#running = false;
    cancelAnimationFrame(this.#raf);
    this.#elapsed += performance.now() - this.#prevTickTime;
  };

  resume = () => {
    if (this.#running) return;
    this.#running = true;
    this.#raf = requestAnimationFrame((ts) => {
      this.#prevTickTime = ts;
      this.#tick(ts);
    });
  };

  position = (p: number) => {
    this.#running = false;
    cancelAnimationFrame(this.#raf);
    this.#elapsed = p * this.#duration;
    this.#state({ progress: this.#easingFn(clamp(0, p, 1)) });
  };

  @effect((ele) => [ele.autoplay, ele.text, ele.easing])
  #initAnimation = () => {
    if (this.autoplay || this.#running) {
      this.play();
    }
  };

  #renderChar(layout: CharLayout) {
    const { char, x, segments } = layout;
    const letter = LETTERS[char.toLowerCase()];
    if (!letter) return svg``;

    return svg`
      <g transform=${`translate(${x} 20)`} data-title=${char}>
        ${letter.paths.map((shape, i) => {
          const seg = segments[i]!;
          const len = this.#state.progress * this.layout.totalLength;
          const drawn = Math.max(0, Math.min(seg.length, len - seg.globalOffset));
          if (!drawn) return svg``;

          if (shape.dot) {
            return svg`<circle cx=${shape.dot.cx} cy=${shape.dot.cy} r=${shape.dot.r} fill="white" />`;
          }

          return svg`
            <path
              d=${shape.d}
              fill="none"
              stroke="white"
              stroke-width=${this.#strokeWidth}
              stroke-linecap="round"
              stroke-linejoin="round"
              pathLength=${seg.length}
              stroke-dasharray=${`${drawn} ${seg.length + 10}`}
              stroke-dashoffset="0"
            />
          `;
        })}
      </g>
    `;
  }

  render = () => {
    const height = 44;
    const { chars, width } = this.layout;

    return svg`
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox=${`0 0 ${width} ${height}`}
        preserveAspectRatio="xMinYMid meet"
      >
        <defs>
          <linearGradient id=${this.#gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            ${this.#colors.map((color, i, arr) => svg`<stop offset=${`${(i / (arr.length - 1)) * 100}%`} stop-color=${color} />`)}
          </linearGradient>
          <mask id=${this.#maskId} maskUnits="userSpaceOnUse" x="0" y="0" width=${width} height=${height}>
            ${chars.map((cl) => this.#renderChar(cl))}
          </mask>
        </defs>
        <rect x="0" y="0" width=${width} height=${height} fill=${`url(#${this.#gradientId})`} mask=${`url(#${this.#maskId})`} />
      </svg>
    `;
  };
}
