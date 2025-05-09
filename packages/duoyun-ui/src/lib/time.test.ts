import { expect } from '@mantou/gem/test/utils';

import { formatDuration, Time } from './time';

const date1 = '2010-01-12 04:00:00';

it('`D.format`', () => {
  expect(new Time(date1).format('YYYY-MM-DD HH:mm:ss')).to.equal(date1);
});

it('`D.relativeTimeFormat`', () => {
  expect(new Time().relativeTimeFormat(new Time(), { min: 1, lang: 'zh' })).to.equal('此刻');
  expect(new Time(date1).relativeTimeFormat(new Time(date1).subtract(3, 's'), { min: 1, lang: 'zh' })).to.equal(
    '3秒前',
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
  expect(formatDuration(100)).to.equal('100 ms');
  expect(formatDuration(1000)).to.equal('1 sec');
  expect(formatDuration(1000 * 60)).to.equal('1 min');
  expect(formatDuration(1000 * 60 * 60)).to.equal('1 hr');
  expect(formatDuration(1000 * 60 * 60 * 24)).to.equal('1 day');
  expect(formatDuration(1000 * 60 * 60 * 24 * 6)).to.equal('6 days');
  expect(formatDuration(1000 * 60 * 60 * 24 * 30)).to.equal('30 days');
  expect(formatDuration(1000 * 60 * 60 * 24 * 31)).to.equal('31 days');
});
