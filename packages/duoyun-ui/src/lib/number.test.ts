import { expect } from '@open-wc/testing';

import { formatNumber, formatToPrecision, adjustRange } from './number';

it('`adjustRange`', () => {
  expect(adjustRange([0, 0], 5)).eql([0, 0.001]);
  expect(adjustRange([0, 0.006], 5)).eql([0.0, 0.01]);
  expect(adjustRange([0, 0.009], 5)).eql([0.0, 0.01]);

  expect(adjustRange([0, 0.06], 5)).eql([0.0, 0.1]);
  expect(adjustRange([0, 0.09], 5)).eql([0.0, 0.1]);

  expect(adjustRange([0, 0.3], 5)).eql([0, 0.5]);
  expect(adjustRange([0, 0.7], 5)).eql([0, 1]);

  expect(adjustRange([0, 1], 5)).eql([0, 1]);
  expect(adjustRange([0, 2], 5)).eql([0, 2]);
  expect(adjustRange([0, 3], 5)).eql([0, 3]);
  expect(adjustRange([0, 4], 5)).eql([0, 5]);
  expect(adjustRange([0, 7], 5)).eql([0, 7]);

  expect(adjustRange([0, 20], 5)).eql([0, 20]);
  expect(adjustRange([0, 21], 5)).eql([0, 25]);
  expect(adjustRange([0, 33], 5)).eql([0, 35]);
  expect(adjustRange([0, 56], 5)).eql([0, 60]);
  expect(adjustRange([0, 61], 5)).eql([0, 65]);
  expect(adjustRange([0, 87], 5)).eql([0, 100]);
  expect(adjustRange([0, 100], 5)).eql([0, 100]);
});

it('`formatToPrecision`', () => {
  expect(formatToPrecision(1 / 3)).equal(0.33);
  expect(formatToPrecision(2 / 3)).equal(0.67);
  expect(formatToPrecision(-2 / 3)).equal(-0.67);
});

it('`formatNumber` 默认选项', () => {
  expect(formatNumber(1, {})).include({ number: '1', unit: '' });
  expect(formatNumber(10, {})).include({ number: '10', unit: '' });
  expect(formatNumber(10.01, {})).include({ number: '10.01', unit: '' });
  expect(formatNumber(10000, {})).include({ number: '10,000', unit: '' });
});

it('`formatNumber` 小数点', () => {
  expect(formatNumber(1, { dotAfterCount: 0 })).include({ number: '1', unit: '' });
  expect(formatNumber(10, { dotAfterCount: 1 })).include({ number: '10', unit: '' });
  expect(formatNumber(10, { dotAfterCount: 1, autoOmitFraction: false })).include({ number: '10.0', unit: '' });
  expect(formatNumber(10.02, { dotAfterCount: 1, autoOmitFraction: false })).include({ number: '10.0', unit: '' });
  expect(formatNumber(10.09, { dotAfterCount: 1, autoOmitFraction: false })).include({ number: '10.1', unit: '' });
  expect(formatNumber(10000, { dotAfterCount: 3, autoOmitFraction: false })).include({
    number: '10,000.000',
    unit: '',
  });
  expect(formatNumber(10000.001, { dotAfterCount: 3 })).include({ number: '10,000.001', unit: '' });
});

it('`formatNumber` 固定进制格式化', () => {
  expect(formatNumber(1, { units: ['', '万', '亿'], unitSize: 10000 })).include({ number: '1', unit: '' });
  expect(formatNumber(10, { units: ['', '万', '亿'], unitSize: 10000 })).include({ number: '10', unit: '' });
  expect(formatNumber(100000, { units: ['', '万', '亿'], unitSize: 10000 })).include({
    number: '10.00',
    unit: '万',
  });
  expect(formatNumber(1000000, { units: ['', '万', '亿'], unitSize: 10000, level: 2 })).include({
    number: '0.01',
    unit: '亿',
  });
  expect(
    formatNumber(61999588296, {
      unitSize: 1000,
      units: ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps', 'Pbps', 'Ebps', 'Zbps', 'Ybps'],
      level: 2,
    }),
  ).include({
    number: '61,999.59',
    unit: 'Mbps',
  });
  expect(
    formatNumber(61999588296, {
      unitSize: 1000,
      units: ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps', 'Pbps', 'Ebps', 'Zbps', 'Ybps'],
    }),
  ).include({
    number: '62.00',
    unit: 'Gbps',
  });
});

it('`formatNumber` 千分位', () => {
  expect(formatNumber(100, { units: [''], unitSize: 10 })).include({ number: '100', unit: '' });
  expect(formatNumber(1000, { units: [''], unitSize: 10 })).include({ number: '1,000', unit: '' });
  expect(formatNumber(1000000, { units: [''], unitSize: 10 })).include({ number: '1,000,000', unit: '' });
  expect(formatNumber(1000000, { units: [''], unitSize: 10, comma: 0 })).include({
    number: '1000000',
    unit: '',
  });
  expect(formatNumber(100000, { units: [''], unitSize: 10, comma: 2 })).include({
    number: '10,00,00',
    unit: '',
  });
});

it('`formatNumber` 非固定进制格式化', () => {
  expect(formatNumber(60 * 60 * 12, { units: ['秒', '分', '时', '天'], unitSize: [60, 60, 24] })).include({
    number: '12.00',
    unit: '时',
  });
  expect(formatNumber(60 * 60 * 24 * 3, { units: ['秒', '分', '时', '天'], unitSize: [60, 60, 24] })).include({
    number: '3.00',
    unit: '天',
  });
  expect(formatNumber(60 * 60 * 24 * 3.5, { units: ['秒', '分', '时', '天'], unitSize: [60, 60, 24] })).include({
    number: '3.50',
    unit: '天',
  });
});

it('`formatNumber` 非固定进制小数进制格式化', () => {
  expect(formatNumber(0.1, { units: ['', '%'], unitSize: 1 / 100 })).include({ number: '10.00', unit: '%' });
  expect(formatNumber(0.001, { units: ['', '%'], unitSize: 1 / 100, level: 1 })).include({
    number: '0.10',
    unit: '%',
  });
  expect(formatNumber(0.1, { units: ['', '%', '‰', '‱'], unitSize: [1 / 100, 1 / 10, 1 / 10] })).include({
    number: '10.00',
    unit: '%',
  });
  expect(formatNumber(0.001, { units: ['', '%', '‰', '‱'], unitSize: [1 / 100, 1 / 10, 1 / 10] })).include({
    number: '1.00',
    unit: '‰',
  });
  expect(formatNumber(0.000001, { units: ['', '%', '‰', '‱'], unitSize: [1 / 100, 1 / 10, 1 / 10] })).include({
    number: '0.01',
    unit: '‱',
  });
});
