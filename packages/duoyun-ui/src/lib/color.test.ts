import { expect } from '@open-wc/testing';

import { parseHexColor, rgbToRgbColor, rgbToHslColor, hsvToRgb, rgbToHsv, rgbToHsl, hslToRgb } from './color';
import { formatToPrecision } from './number';

it('`parseHexColor`', () => {
  expect(parseHexColor('#fff')).to.eql([255, 255, 255, 1]);
  expect(parseHexColor('#fff0')).to.eql([255, 255, 255, 0]);
});

it('`rgbToRgbaColor`', () => {
  expect(rgbToRgbColor([0, 0, 0, 1])).to.equal(`rgb(0,0,0)`);
  expect(rgbToRgbColor([0, 0, 0, 0.2])).to.equal(`rgba(0,0,0,0.2)`);
  expect(rgbToRgbColor([255, 255, 255, 1])).to.equal(`rgb(255,255,255)`);
});

it('`rgbToHslaColor`', () => {
  expect(rgbToHslColor([0, 0, 0, 1])).to.equal(`hsl(0,0%,0%)`);
  expect(rgbToHslColor([0, 0, 0, 0.2])).to.equal(`hsla(0,0%,0%,0.2)`);
  expect(rgbToHslColor([255, 255, 255, 1])).to.equal(`hsl(0,0%,100%)`);
});

it('`hsv - rgb`', () => {
  expect(hsvToRgb([0.5, 0.6, 0.7])).to.eql([71, 179, 179]);
  expect(rgbToHsv([71, 179, 179]).map((e) => formatToPrecision(e))).to.eql([0.5, 0.6, 0.7]);
  expect(hsvToRgb([0.1, 0.2, 0.3])).to.eql([77, 70, 61]);
  expect(rgbToHsv([76, 70, 61]).map((e) => formatToPrecision(e))).to.eql([0.1, 0.2, 0.3]);
});

it('`hsl - rgb`', () => {
  expect(hslToRgb([0.5, 0.6, 0.7])).to.eql([133, 224, 224]);
  expect(rgbToHsl([133, 224, 224]).map((e) => formatToPrecision(e, 1))).to.eql([0.5, 0.6, 0.7]);
  expect(hslToRgb([0.1, 0.2, 0.3])).to.eql([92, 80, 61]);
  expect(rgbToHsl([92, 80, 61]).map((e) => formatToPrecision(e))).to.eql([0.1, 0.2, 0.3]);
});
