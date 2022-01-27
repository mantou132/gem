import { expect } from '@open-wc/testing';

import { Time, formatDuration } from './time';

const date1 = '2010-01-12 04:00:00';

it('`D.format`', () => {
  expect(new Time(date1).format('YYYY-MM-DD HH:mm:ss')).to.equal(date1);
});

it('`D.relativeTimeFormat`', () => {
  expect(new Time().relativeTimeFormat(new Time(), { min: 1, lang: 'zh' })).to.equal('此刻');
  expect(new Time(date1).relativeTimeFormat(new Time(date1).subtract(3, 's'), { min: 1, lang: 'zh' })).to.equal(
    '3秒钟前',
  );
  expect(new Time(date1).relativeTimeFormat(new Time(date1).subtract(25, 'h'), { min: 1, lang: 'zh' })).to.equal(
    '昨天',
  );
  expect(new Time(date1).relativeTimeFormat(new Time(date1).subtract(25, 'h'), { min: 2, lang: 'zh' })).to.equal(
    '25小时前',
  );
  expect(new Time(date1).relativeTimeFormat(new Time(date1).add(25, 'h'), { min: 1, lang: 'zh' })).to.equal('明天');
  expect(new Time(date1).relativeTimeFormat(new Time(date1).add(25, 'h'), { min: 2, lang: 'zh' })).to.equal('25小时后');
  expect(new Time(date1).relativeTimeFormat(new Time(date1).subtract(1, 'd'), { min: 1, lang: 'zh' })).to.equal('昨天');
  expect(new Time(date1).relativeTimeFormat(new Time(date1).subtract(26, 'd'), { min: 1, lang: 'zh' })).to.equal(
    '4周前',
  );
  expect(new Time(date1).relativeTimeFormat(new Time(date1).subtract(31, 'd'), { min: 1, lang: 'zh' })).to.equal(
    '上个月',
  );
  expect(new Time(date1).relativeTimeFormat(new Time(date1).subtract(31, 'd'), { min: 2, lang: 'zh' })).to.equal(
    '5周前',
  );
  expect(new Time(date1).relativeTimeFormat(new Time(date1).add(1, 'd'), { min: 1, lang: 'zh' })).to.equal('明天');
  expect(new Time(date1).relativeTimeFormat(new Time(date1).add(3, 'd'), { min: 1, lang: 'zh' })).to.equal('3天后');
});

it('`parseDuration`', () => {
  expect(formatDuration(100)).to.equal('100 Millisecond');
  expect(formatDuration(1000)).to.equal('1 Second');
  expect(formatDuration(1000 * 60)).to.equal('1 Minute');
  expect(formatDuration(1000 * 60 * 60)).to.equal('1 Hour');
  expect(formatDuration(1000 * 60 * 60 * 24)).to.equal('1 Day');
  expect(formatDuration(1000 * 60 * 60 * 24 * 6)).to.equal('6 Day');
  expect(formatDuration(1000 * 60 * 60 * 24 * 30)).to.equal('5 Week');
  expect(formatDuration(1000 * 60 * 60 * 24 * 31)).to.equal('1 Month');
});
