// [0,255]
export type RGB = readonly [number, number, number];
// [0,255], [0, 1]
export type RGBA = readonly [number, number, number, number];
// [0,1]
export type HSL = readonly [number, number, number];
// [0, 1]
export type HSLA = readonly [number, number, number, number];
// [0,1]
export type HSV = readonly [number, number, number];
export type HexColor = `#${string}`;
export type RGBColor = `rgb${'a' | ''}(${string})`;
export type HSLColor = `hsl${'a' | ''}(${string})`;

// e.g: chart
export const commonColors = Array(20)
  .fill(null)
  .map((_, index) => Math.abs((326 + index * 81 * (index % 2 ? 1 : -1)) % 360) / 360)
  .map((h) => [h, 78 / 100, 64 / 100] as const)
  .map((hsl) => hslToRgb(hsl))
  .map((rgb) => rgbToHexColor(rgb));

export function rgbToRgbColor([r, g, b, a = 1]: RGB | RGBA): RGBColor {
  const rgbStr = [r, g, b].join();
  return a === 1 ? `rgb(${rgbStr})` : `rgba(${rgbStr},${Number(a.toFixed(2))})`;
}

export function rgbToHslColor([r, g, b, a = 1]: RGB | RGBA): HSLColor {
  const [h, s, l] = rgbToHsl([r, g, b]);
  const hslStr = `${Math.round(h * 360)},${Math.round(s * 100)}%,${Math.round(l * 100)}%`;
  return a === 1 ? `hsl(${hslStr})` : `hsla(${hslStr},${Number(a.toFixed(2))})`;
}

export function rgbToHexColor(rgba: RGB | RGBA): HexColor {
  const rgb = rgba.slice(0, 3);
  return `#${(rgba.length === 4 && rgba[3] !== 1 ? [...rgb, rgba[3] * 255] : rgb)
    .map((e) => Math.round(e).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function randomColor(): RGB;
export function randomColor(type: 'rgba'): RGBColor;
export function randomColor(type: 'hsla'): HSLColor;
export function randomColor(type: 'hex'): HexColor;
export function randomColor(type?: 'hex' | 'rgba' | 'hsla'): HexColor | HSLColor | RGBColor | RGB {
  const randomNumber = () => Math.round(Math.random() * 255);
  const rgb: RGB = [randomNumber(), randomNumber(), randomNumber()];
  switch (type) {
    case 'rgba':
      return rgbToRgbColor(rgb);
    case 'hsla':
      return rgbToHslColor(rgb);
    case 'hex':
      return rgbToHexColor(rgb);
    default:
      return rgb;
  }
}

export function isValidHexColor(str: string): str is HexColor {
  // https://stackoverflow.com/a/9682781/7167456
  return /^#(?:[0-9a-f]{3}){1,2}$/i.test(str);
}

export function parseHexColor(str: HexColor): RGBA {
  const s = str.replace('#', '');
  const fullHex = s.length === 3 || s.length === 4 ? s.replace(/\w/g, ($1) => $1 + $1) : s;
  const [r, g, b, a = 255] = fullHex
    .split(/(\w{2})/)
    .filter((e) => !!e)
    .map((e) => parseInt(e, 16));
  return [r, g, b, a / 255];
}

/**
 * note: ignore alpha
 */
export function luminance([r, g, b]: RGB | RGBA) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * note: ignore alpha
 */
export function contrast(rgb1: RGB | RGBA, rgb2: RGB | RGBA) {
  const l1 = luminance([rgb1[0], rgb1[1], rgb1[2]]) + 0.05;
  const l2 = luminance([rgb2[0], rgb2[1], rgb2[2]]) + 0.05;
  return Math.max(l1, l2) / Math.min(l1, l2);
}

/**
 * note: ignore alpha
 * edit for https://stackoverflow.com/questions/8022885/rgb-to-hsv-color-in-javascript
 */
export function rgbToHsl(rgb: RGB | RGBA): HSL {
  const [r, g, b] = rgb.map((e) => e / 255);
  const v = Math.max(r, g, b),
    c = v - Math.min(r, g, b),
    f = 1 - Math.abs(v + v - c - 1);
  const h = c && (v == r ? (g - b) / c : v == g ? 2 + (b - r) / c : 4 + (r - g) / c);
  return [(h < 0 ? h + 6 : h) / 6, f ? c / f : 0, (v + v - c) / 2];
}

export function hslToRgb([h, s, l]: HSL | HSLA): RGB {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number, k = (n + h * 12) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return [f(0), f(8), f(4)].map((e) => Math.round(e * 255)) as unknown as RGB;
}

export function rgbToHsv(rgb: RGB | RGBA): HSV {
  const [r, g, b] = rgb.map((e) => e / 255);
  const v = Math.max(r, g, b),
    c = v - Math.min(r, g, b);
  const h = c && (v == r ? (g - b) / c : v == g ? 2 + (b - r) / c : 4 + (r - g) / c);
  return [(h < 0 ? h + 6 : h) / 6, v && c / v, v];
}

export function hsvToRgb([h, s, v]: HSV): RGB {
  const f = (n: number, k = (n + h * 6) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [f(5), f(3), f(1)].map((e) => Math.round(e * 255)) as unknown as RGB;
}

export function hslToHsv([h, s, l]: HSL | HSLA): HSV {
  const v = s * Math.min(l, 1 - l) + l;
  return [h, v ? 2 - (2 * l) / v : 0, v];
}

export function hsvToHsl([h, s, v]: HSV): HSL {
  const l = v - (v * s) / 2,
    m = Math.min(l, 1 - l);
  return [h, m ? (v - l) / m : 0, l];
}
