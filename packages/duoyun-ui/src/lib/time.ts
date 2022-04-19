import { locale } from './locale';

const intlDigitFormatter = Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function parseDate(date?: number | Date) {
  const parts = isNaN(Number(date)) ? [] : intlDigitFormatter.formatToParts(date);
  const dateObj: Record<string, string> = {};
  parts.forEach(({ type, value }) => (dateObj[type] = value));
  const { year = '', month = '', day = '', hour = '', minute = '', second = '' } = dateObj;
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1262801
  return { year, month, day, hour: hour === '24' ? '00' : hour, minute, second };
}

const Ds = 1000;
const Dm = Ds * 60;
const Dh = Dm * 60;
const Dd = Dh * 24;
const Dw = Dd * 7;
const DM = Dd * 31;
const DY = Dd * 366;

type Unit = 'Y' | 'M' | 'w' | 'd' | 'h' | 'm' | 's' | 'ms';

type RelativeTimeFormatUnit = Exclude<Unit, 'ms'>;

type RelativeTimeFormatOption = {
  rtf?: Intl.RelativeTimeFormat;
  min?: number;
  lang?: string | string[];
};

export type NarrowRelativeTime = `${number}${RelativeTimeFormatUnit}`;

const durationList: [RelativeTimeFormatUnit, number][] = [
  ['Y', DY],
  ['M', DM],
  ['w', Dw],
  ['d', Dd],
  ['h', Dh],
  ['m', Dm],
  ['s', Ds],
];

const unitMap: Record<RelativeTimeFormatUnit, Intl.RelativeTimeFormatUnit> = {
  Y: 'year',
  M: 'month',
  w: 'week',
  d: 'day',
  h: 'hour',
  m: 'minute',
  s: 'second',
};

/**
 * @example
 *
 * ```ts
 * parseNarrowTimeRange('d');
 * parseNarrowTimeRange('m');
 * ```
 */
export function parseNarrowTimeRange(str: undefined | null): undefined;
export function parseNarrowTimeRange(str: RelativeTimeFormatUnit): [Time, Time];
export function parseNarrowTimeRange(str: string | null | undefined): [Time, Time] | undefined;
export function parseNarrowTimeRange(str: string | null | undefined): [Time, Time] | undefined {
  if (!str) return;
  if (str in unitMap) {
    return [new Time().startOf(str as RelativeTimeFormatUnit), new Time().endOf(str as RelativeTimeFormatUnit)];
  }
}

/**
 * @example
 *
 * ```ts
 * parseNarrowRelativeTime('2d');
 * parseNarrowRelativeTime('-2m');
 * ```
 */
export function parseNarrowRelativeTime(str: undefined | null): undefined;
export function parseNarrowRelativeTime(str: NarrowRelativeTime): Time;
export function parseNarrowRelativeTime(str: string | null | undefined): Time | undefined;
export function parseNarrowRelativeTime(str: string | null | undefined): Time | undefined {
  if (!str) return;
  const r = str.match(/^(?<number>-?\d+)(?<unit>\w)$/);
  if (r?.groups && r.groups?.unit in unitMap) {
    const number = Number(r.groups.number);
    const unit = r.groups.unit as RelativeTimeFormatUnit;
    return new Time().add(number, unit);
  }
}

function getDuration(unit: Unit) {
  switch (unit) {
    case 'w':
      return Dw;
    case 'd':
      return Dd;
    case 'h':
      return Dh;
    case 'm':
      return Dm;
    case 's':
      return Ds;
    default:
      return 1;
  }
}

export class Time extends Date {
  static #rtfCache = new Map<string, Intl.RelativeTimeFormat>();
  static #formatReg = /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|H{1,2}|m{1,2}|s{1,2}/g;

  get isInvalidTime() {
    return isNaN(this.valueOf());
  }

  formatToParts(opt: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short' }) {
    if (this.isInvalidTime) return [];
    return Intl.DateTimeFormat(locale.localeCode, opt).formatToParts(this);
  }

  format(opt: string | Intl.DateTimeFormatOptions = 'YYYY-MM-DD HH:mm:ss') {
    if (typeof opt !== 'string') {
      if (this.isInvalidTime) return '';
      return Intl.DateTimeFormat(locale.localeCode, opt).format(this);
    }
    const { year, month, day, hour, minute, second } = parseDate(this);
    const map: Record<string, string> = {
      YYYY: year,
      MM: month,
      DD: day,
      HH: hour,
      mm: minute,
      ss: second,
    };
    return opt.replace(Time.#formatReg, (match) => map[match]);
  }

  subtract(number: number, unit: Unit) {
    switch (unit) {
      case 'Y':
        this.setFullYear(this.getFullYear() - number);
        break;
      case 'M':
        this.setMonth(this.getMonth() - number);
        break;
      default:
        this.setTime(this.getTime() - number * getDuration(unit));
    }
    return this;
  }

  add(number: number, unit: Unit) {
    this.subtract(-number, unit);
    return this;
  }

  startOf(unit: Unit) {
    switch (unit) {
      case 'w':
        this.subtract(this.getDay(), 'd').startOf('d');
        break;
      case 'Y':
        this.setMonth(0);
      case 'M':
        this.setDate(1);
      case 'd':
        this.setHours(0);
      case 'h':
        this.setMinutes(0);
      case 'm':
        this.setSeconds(0);
      case 's':
        this.setMilliseconds(0);
      case 'ms':
    }
    return this;
  }

  endOf(unit: Unit) {
    this.add(1, unit).startOf(unit).subtract(1, 'ms');
    return this;
  }

  isSome<T extends Date>(d: T | number, unit: Unit) {
    let result = true;
    const targetDate = new Time(d);
    switch (unit) {
      case 'w':
        const ws = new Time(this).subtract(this.getDay(), 'd').startOf('d');
        return targetDate.getTime() >= ws.getTime() && targetDate.getTime() <= ws.getTime() + 7 * Dd;
      case 'ms':
        return this.getTime() === targetDate.getTime();
      case 's':
        result &&= this.getSeconds() === targetDate.getSeconds();
      case 'm':
        result &&= this.getMinutes() === targetDate.getMinutes();
      case 'h':
        result &&= this.getHours() === targetDate.getHours();
      case 'd':
        result &&= this.getDate() === targetDate.getDate();
      case 'M':
        result &&= this.getMonth() === targetDate.getMonth();
      case 'Y':
        result &&= this.getFullYear() === targetDate.getFullYear();
    }
    return result;
  }

  /**
   * new D().relativeTimeFormat(new D().add(40, 'd'), { unitLimit: 2, lang: 'zh' }) => '40天后'
   */
  relativeTimeFormat(
    date: Date | Time | number,
    { min = 1, lang = locale.localeCode, rtf = Time.#rtfCache.get(String(lang)) }: RelativeTimeFormatOption = {},
  ) {
    if (!rtf) {
      rtf = new Intl.RelativeTimeFormat(lang, { style: 'short', numeric: 'auto' });
      Time.#rtfCache.set(String(lang), rtf);
    }
    const target = new Time(date);
    const diff = target.getTime() - this.getTime();
    for (const [unit, d] of durationList) {
      const n = Math.trunc(diff / d);
      if (Math.abs(n) >= 1 * min) {
        const normalizeDiff = target.startOf(unit).getTime() - new Time(this).startOf(unit).getTime();
        return rtf.format(Math.round(normalizeDiff / d), unitMap[unit]);
      }
    }
    return rtf.format(0, 'minute');
  }
}

export function parseDuration(ms: number) {
  if (ms >= DY) {
    return { number: Math.ceil(ms / DY).toString(), unit: locale.year };
  }
  if (ms >= DM) {
    return { number: Math.ceil(ms / DM).toString(), unit: locale.month };
  }
  if (ms >= Dw) {
    return { number: Math.ceil(ms / Dw).toString(), unit: locale.week };
  }
  if (ms >= Dd) {
    return { number: Math.ceil(ms / Dd).toString(), unit: locale.day };
  }
  if (ms >= Dh) {
    return { number: Math.ceil(ms / Dh).toString(), unit: locale.hour };
  }
  if (ms >= Dm) {
    return { number: Math.ceil(ms / Dm).toString(), unit: locale.minute };
  }
  if (ms >= Ds) {
    return { number: Math.ceil(ms / Ds).toString(), unit: locale.second };
  }
  return { number: Math.ceil(ms).toString(), unit: locale.millisecond };
}

// https://github.com/tc39/proposal-intl-duration-format
export function formatDuration(ms: number, numeric?: boolean) {
  if (numeric) {
    const sec = Math.ceil(ms / 1000);
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec - hours * 3600) / 60);
    const seconds = sec - hours * 3600 - minutes * 60;
    const fill = (n: number) => n.toString().padStart(2, '0');
    return `${fill(hours)}:${fill(minutes)}:${fill(seconds)}`;
  }
  const { number, unit } = parseDuration(ms);
  return `${number} ${unit}`;
}
