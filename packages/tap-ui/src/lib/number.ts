// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat

import { locale } from '../lib/locale';

/**Use a comma to separate numbers */
export function splitInt(int: string | number, comma = 3) {
  if (comma === 0) return int;
  return String(int).replace(new RegExp(`(\\d)(?=(\\d{${comma}})+$)`, 'g'), '$1,');
}

interface FormatNumberOptions {
  // 小数位数，默认 2
  dotAfterCount?: number;
  // 进制大小，如 1/100, 10, 1024, [60, 60, 24, 30, 365]，默认 10
  unitSize?: number | number[];
  // 单位，默认 ['']
  units?: string[];
  // 使用逗号分割，指定分割位，默认 3
  comma?: number;
  // 如果没有进行进制转换的整数将不带小数，例如 `1` 显示成 `1` 而不是 `1.00`， 默认为 `true`
  autoOmitFraction?: boolean;
  // 指定输出单位级别
  level?: number;
}

/**
 * Format number, generator object
 * Need to be combined as a strings on after
 */
export function formatNumber(value: number | undefined | null, option: FormatNumberOptions) {
  if (value !== 0 && !value) return { number: '-', unit: '' };

  const { dotAfterCount = 2, unitSize = 10, units = [''], comma = 3, autoOmitFraction = true, level } = option;

  let l = 0;
  let n = value;

  while (true) {
    const u = Array.isArray(unitSize) ? unitSize[l] : unitSize;
    const haveArg = u && l < units.length - 1;
    const needNextLevel = u > 1 ? n >= u : n < 1;
    if (haveArg && (level === undefined ? needNextLevel : l < level)) {
      l++;
      n /= u;
    } else {
      break;
    }
  }

  const oint = Math.trunc(n);
  const fract = n - oint;
  const onlyInt = autoOmitFraction && l === 0 && Math.trunc(value) === value;
  const fractPart = fract.toFixed(dotAfterCount);
  const fractPartStr = fractPart.slice(2);
  const int = fractPart.startsWith('1') ? oint + 1 : oint;
  return {
    // 整数
    int,
    // 小数
    fract,
    // 格式化后的整个数字
    number: `${splitInt(int, comma)}${onlyInt || dotAfterCount === 0 ? '' : `.${fractPartStr}`}`,
    // 单位
    unit: units[l],
  };
}

export function formatBandwidth(value: number, needDetail = false) {
  return formatNumber(value, {
    unitSize: 1000,
    units: ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps', 'Pbps', 'Ebps', 'Zbps', 'Ybps'],
    level: needDetail ? 2 : undefined,
  });
}

export function formatTraffic(value: number, isDetail = false) {
  return formatNumber(value, {
    unitSize: 1024,
    units: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    level: isDetail ? 3 : undefined,
  });
}

export function formatDecimal(value: number, isDetail = false) {
  return formatNumber(value, {
    unitSize: 1000,
    units: ['', locale.thousand, locale.million, locale.trillion],
    level: isDetail ? 0 : undefined,
  });
}

export function formatCurrency(value: number, isDetail = false) {
  return formatNumber(value, {
    level: 0,
    dotAfterCount: isDetail ? 2 : 0,
  });
}

export function formatPercentage(value: number, isDetail = false) {
  return formatNumber(value, {
    unitSize: 1 / 100,
    units: ['', '%'],
    level: 1,
    dotAfterCount: isDetail ? 5 : undefined,
  });
}

export function formatToPrecision(value: number, count = 2) {
  const i = 10 ** count;
  return Math.round(value * i) / i;
}

/**Similar CSS clamp */
export function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function middle(x: number, y: number) {
  return Math.floor((x + y) / 2);
}

/**
 * Calculate the friendly range based on the maximum and minimum value,
 * e.g: [0, 100], [0,500]
 */
export function adjustRange([min, max]: number[], stepCount: number, units?: number[]) {
  const getRatio = (d: number) => {
    if (d > 10) return 1;
    if (d > 0.1) return 10;
    if (d > 0.01) return 100;
    if (d > 0.001) return 1000;
    return 10000;
  };

  const scale = getRatio(max - min);
  const scaleMin = min * scale;
  const scaleMax = max * scale + (max === min ? 10 : 0);
  const scaleRange = scaleMax - scaleMin;

  const getTotal = (unit: number) => {
    const currentStepCount = Math.ceil(scaleRange / unit);
    const multiple = Math.ceil(currentStepCount / stepCount);
    return stepCount * multiple * unit;
  };

  const getBase = (i: number) => {
    if (units) {
      return units[i] || units[units.length - 1];
    }
    if (i === 0) return 1;
    if (scaleRange > 10) return 10;
    if (scaleRange > 1 && scaleRange > 10 / stepCount) return 1;
    return 0.1;
  };

  const getUnit = (unit: number): [number, number, number] => {
    let pp = unit;
    let p = unit;
    let u = unit;
    for (let i = 0; ; i++) {
      if (i > 100) {
        break;
      }

      const nextUnit = u * getBase(i);
      const total = getTotal(nextUnit);
      const diff = total - scaleRange;
      if (diff > total / stepCount) {
        break;
      }
      pp = p;
      p = u;
      u = nextUnit;
    }
    return [u, p, pp];
  };
  const [unit, _, prevUnit] = getUnit(1);

  const adjustedMin = Math.floor(scaleMin / prevUnit) * prevUnit;
  const adjustedMax = adjustedMin + getTotal(unit);
  return [adjustedMin / scale, adjustedMax / scale];
}

/**Generate a pseudo -random function */
export function pseudoRandom(seed: number) {
  const MULTIPLIER = 48271;
  const MODULUS = 2147483647;

  let current = seed;

  return () => {
    current = (current * MULTIPLIER) % MODULUS;
    return current;
  };
}

/**Random large integer normalization, output 0-1 */
export function normalizeNumber(n: number) {
  return parseFloat(`0.${[...Math.abs(n).toString()].reverse().join('')}`);
}
