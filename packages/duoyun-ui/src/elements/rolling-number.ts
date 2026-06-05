import { adoptedStyle, attribute, customElement, effect, numattribute, part, shadow } from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { styleMap } from '@mantou/gem/lib/utils';

import { type EasingType, getEasing } from '../lib/easing';
import { clamp } from '../lib/number';

// The same edge band is used by the container mask and by each outgoing digit's opacity.
const DIGIT_FADE_SIZE = 0.18;

const style = css`
  :host(:where(:not([hidden]))) {
    display: inline-flex;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .digit-container {
    --fade-size: ${DIGIT_FADE_SIZE}em;
    position: relative;
    overflow: hidden;
    height: 1em;
    mask-image: linear-gradient(
      to bottom,
      transparent,
      black var(--fade-size),
      black calc(100% - var(--fade-size)),
      transparent
    );
  }
  .digit-track {
    display: flex;
    flex-direction: column;
    will-change: transform, filter;
  }
  .digit-char {
    height: 1em;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .separator {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1em;
  }
`;

const MAX_DIGIT_DISTANCE = 9;
const EASING_SAMPLE_STEP = 0.001;
const EASING_MAX_SAMPLE_COUNT = 80;

enum Kind {
  Digit = 'digit',
  Separator = 'separator',
}

type Segment = { kind: Kind.Digit; char: string } | { kind: Kind.Separator; char: string };

function isDigitChar(char: string) {
  return /\d/.test(char);
}

function splitNumberStr(str: string): Segment[] {
  return [...str].map((char) => {
    return isDigitChar(char) ? { kind: Kind.Digit, char } : { kind: Kind.Separator, char };
  });
}

function countDigits(segments: { kind: Kind }[]) {
  return segments.filter((s) => s.kind === Kind.Digit).length;
}

function getDigitAt(segments: Segment[], pos: number) {
  let n = 0;
  for (const seg of segments) {
    if (seg.kind === Kind.Digit) {
      if (n === pos) return seg.char;
      n++;
    }
  }
  return '';
}

function getValueText(value: number) {
  return String(value || 0);
}

/**
 * '' represents blank (invisible placeholder):
 *   '' → '5'  : ['', '5']        (roll in from blank)
 *   '3' → ''   : ['3', '']        (roll out to blank)
 *   '3' → '7'  : ['3','4','5','6','7']
 *   '7' → '3'  : ['7','6','5','4','3']
 */
function buildTrack(from: string, to: string) {
  if (from === to) return [from];
  if (from === '') return ['', to];
  if (to === '') return [from, ''];
  const a = parseInt(from, 10);
  const b = parseInt(to, 10);
  const track: string[] = [];
  if (a < b) {
    for (let i = a; i <= b; i++) track.push(String(i));
  } else {
    for (let i = a; i >= b; i--) track.push(String(i));
  }
  return track;
}

function buildDirectionalTrack(from: string, to: string, direction: number) {
  if (from === to) return [from];
  if (from === '') return ['', to];
  if (to === '') return [from, ''];

  const track: string[] = [];
  let current = parseInt(from, 10);
  const target = parseInt(to, 10);
  const step = direction >= 0 ? 1 : -1;
  while (true) {
    track.push(String(current));
    if (current === target) break;
    current = (current + step + 10) % 10;
  }
  return track;
}

type DigitAnim = {
  kind: Kind.Digit;
  to: string;
  track: string[];
  fromOffset: number;
  toOffset: number;
  isBlank: boolean;
};

type SeparatorItem = {
  kind: Kind.Separator;
  char: string;
};

type AnimItem = DigitAnim | SeparatorItem;

function isDigitItem(item: AnimItem): item is DigitAnim {
  return item.kind === Kind.Digit;
}

type DigitSource = {
  char: string;
  track?: string[];
  offset?: number;
  direction?: number;
};

function getDigitSources(text: string): DigitSource[] {
  return splitNumberStr(text)
    .filter((seg) => seg.kind === Kind.Digit)
    .map(({ char }) => ({ char }));
}

function getTrackDirection(track: string[]) {
  const digits = track.filter(isDigitChar).map(Number);
  if (digits.length < 2) return 0;
  return Math.sign(digits.at(-1)! - digits[0]!);
}

function buildSmoothTrack(source: DigitSource, to: string) {
  const track = source.track;
  if (!track) {
    const newTrack = buildTrack(source.char, to);
    return { track: newTrack, fromOffset: 0, toOffset: newTrack.length - 1 };
  }

  const fromOffset = clamp(0, source.offset || 0, track.length - 1);
  const direction = source.direction || getTrackDirection(track) || 1;
  const toOffset = track.findIndex((char, index) => char === to && index >= fromOffset);
  if (toOffset >= 0) return { track, fromOffset, toOffset };

  // Retargeting mid-animation should continue along the current rolling direction.
  const nextTrack = [...track, ...buildDirectionalTrack(track.at(-1) || '', to, direction).slice(1)];
  return { track: nextTrack, fromOffset, toOffset: nextTrack.length - 1 };
}

function getMaxDistance(items: AnimItem[]) {
  return Math.max(0, ...items.filter(isDigitItem).map((item) => Math.abs(item.toOffset - item.fromOffset)));
}

function getEasingVelocity(easingFn: (raw: number) => number, raw: number) {
  const start = clamp(0, raw - EASING_SAMPLE_STEP, 1);
  const end = clamp(0, raw + EASING_SAMPLE_STEP, 1);
  if (start === end) return 0;
  return Math.abs((easingFn(end) - easingFn(start)) / (end - start));
}

function getMaxEasingVelocity(easingFn: (raw: number) => number) {
  let max = 0;
  for (let i = 1; i <= EASING_MAX_SAMPLE_COUNT; i++) {
    const raw = i / EASING_MAX_SAMPLE_COUNT;
    max = Math.max(max, getEasingVelocity(easingFn, raw));
  }
  return max || 1;
}

function alignItemsToProgress(items: AnimItem[], progress: number) {
  if (progress >= 1) return;
  items.filter(isDigitItem).forEach((item) => {
    // Rewrite the start offset so restarting the easing curve at the same raw time has no visual jump.
    item.fromOffset = (item.fromOffset - item.toOffset * progress) / (1 - progress);
  });
}

function getDigitOpacity(index: number, offset: number) {
  const top = index - offset;
  const bottom = top + 1;
  if (bottom < DIGIT_FADE_SIZE) return clamp(0, bottom / DIGIT_FADE_SIZE, 1);
  if (top > 1 - DIGIT_FADE_SIZE) return clamp(0, (1 - top) / DIGIT_FADE_SIZE, 1);
  return 1;
}

function buildDigitAnims(fromDigits: DigitSource[], toText: string, isFirstRender: boolean, isRight: boolean) {
  const toSegs = splitNumberStr(toText);
  const fromDc = fromDigits.length;
  const toDc = countDigits(toSegs);
  const maxDc = Math.max(fromDc, toDc);

  const digitAnims: DigitAnim[] = [];
  for (let pos = 0; pos < maxDc; pos++) {
    const fromPos = isRight ? pos : pos - (maxDc - fromDc);
    const toPos = isRight ? pos : pos - (maxDc - toDc);
    const source = fromPos >= 0 && fromPos < fromDc ? fromDigits[fromPos] : { char: isFirstRender ? '0' : '' };
    const to = toPos >= 0 && toPos < toDc ? getDigitAt(toSegs, toPos) : '';
    const { track, fromOffset, toOffset } = buildSmoothTrack(source, to);
    digitAnims.push({ kind: Kind.Digit, to, track, fromOffset, toOffset, isBlank: to === '' });
  }

  return digitAnims;
}

function buildAnimPlan(fromDigits: DigitSource[], toText: string, isFirstRender: boolean, isRight: boolean) {
  const toSegs = splitNumberStr(toText);
  const toDc = countDigits(toSegs);
  const digitAnims = buildDigitAnims(fromDigits, toText, isFirstRender, isRight);
  const blankCount = Math.max(0, digitAnims.length - toDc);
  const items: AnimItem[] = [];
  let digitIdx = 0;

  const addBlank = () => {
    items.push(digitAnims[digitIdx++]);
  };

  const addTargets = () => {
    toSegs.forEach((seg) => {
      if (seg.kind === Kind.Separator) {
        items.push(seg);
      } else {
        items.push(digitAnims[digitIdx++]);
      }
    });
  };

  if (isRight) {
    addTargets();
    Array.from({ length: blankCount }).forEach(addBlank);
  } else {
    Array.from({ length: blankCount }).forEach(addBlank);
    addTargets();
  }

  return items;
}

@customElement('dy-rolling-number')
@adoptedStyle(style)
@shadow()
export class DuoyunRollingNumberElement extends GemElement {
  @part static digit: string;
  @part static separator: string;

  @numattribute value: number;
  @numattribute duration: number;
  @attribute easing: EasingType;
  @numattribute maxblur: number;
  @attribute align: 'left' | 'right';

  #state = createState({ progress: 0 });

  #raf = 0;
  #startTime = 0;
  #running = false;
  #animDuration = 0;
  #items: AnimItem[] = [];
  #prevValue = 0;
  #firstRender = true;

  get #duration() {
    return this.duration || 800;
  }
  get #easingFn() {
    return getEasing(this.easing || 'ease-in-out-cubic');
  }
  get #maxBlur() {
    return this.maxblur || 2;
  }
  get #align() {
    return this.align || 'left';
  }
  get #isRight() {
    return this.#align === 'right';
  }

  #getRawProgress = () => {
    return clamp(0, (performance.now() - this.#startTime) / (this.#animDuration || this.#duration), 1);
  };

  #tick = (ts: number) => {
    if (!this.#running) return;
    const elapsed = ts - this.#startTime;
    const dur = this.#animDuration || this.#duration;
    const raw = clamp(0, elapsed / dur, 1);
    this.#state({ progress: this.#easingFn(raw) });
    if (raw < 1) {
      this.#raf = requestAnimationFrame(this.#tick);
    } else {
      this.#running = false;
      this.#animDuration = 0;
      this.#prevValue = this.value || 0;
      this.#state({ progress: 1 });
    }
  };

  #getAnimationDuration = (raw = 0, progress = 0) => {
    // Short rolls finish faster, but a full 0-9 distance never exceeds `duration`.
    const speedFactor = raw > 0 && raw < 1 && progress < 1 ? (1 - raw) / (1 - progress) : 1;
    return Math.min(this.#duration, (this.#duration * getMaxDistance(this.#items) * speedFactor) / MAX_DIGIT_DISTANCE);
  };

  #getBlur = () => {
    if (!this.#running) return 0;
    const duration = this.#animDuration || this.#duration;
    if (!duration) return 0;
    const easingFn = this.#easingFn;
    // Blur follows instantaneous rolling speed, so retargeted animations do not look under- or over-blurred.
    const speed = (getMaxDistance(this.#items) * getEasingVelocity(easingFn, this.#getRawProgress())) / duration;
    const maxSpeed = (MAX_DIGIT_DISTANCE * getMaxEasingVelocity(easingFn)) / this.#duration;
    return this.#maxBlur * clamp(0, speed / maxSpeed, 1);
  };

  #startAnimation = (duration: number, raw = 0) => {
    cancelAnimationFrame(this.#raf);
    const animDuration = raw > 0 && raw < 1 ? duration / (1 - raw) : duration;
    this.#running = true;
    this.#startTime = performance.now() - raw * animDuration;
    this.#animDuration = animDuration;
    this.#state({ progress: this.#easingFn(raw) });
    this.#raf = requestAnimationFrame(this.#tick);
  };

  #stopAnimation = () => {
    cancelAnimationFrame(this.#raf);
    this.#running = false;
    this.#animDuration = 0;
    this.#state({ progress: 1 });
  };

  #getCurrentDigits = (progress = this.#state.progress) => {
    if (this.#firstRender) return getDigitSources(getValueText(0));
    if (!this.#running) return getDigitSources(getValueText(this.#prevValue));
    // Preserve the current track and fractional offset so a new value can continue from the exact visual state.
    return this.#items.filter(isDigitItem).map((item) => {
      const offset = item.fromOffset + (item.toOffset - item.fromOffset) * progress;
      return {
        char: item.track[Math.round(offset)] || '',
        track: item.track,
        offset,
        direction: getTrackDirection(item.track) || 1,
      };
    });
  };

  @effect((i) => [i.value, i.#align])
  #onValueChange = () => {
    const newValue = this.value || 0;
    const isFirstRender = this.#firstRender;
    const raw = this.#running ? this.#getRawProgress() : 0;
    const keepProgress = raw > 0 && raw < 1;
    const progress = keepProgress ? this.#easingFn(raw) : this.#state.progress;
    const fromDigits = this.#getCurrentDigits(progress);
    const toText = getValueText(newValue);
    this.#firstRender = false;

    this.#items = buildAnimPlan(fromDigits, toText, isFirstRender, this.#isRight);
    const digitAnims = this.#items.filter(isDigitItem);

    if (!digitAnims.some((a) => a.fromOffset !== a.toOffset)) {
      this.#prevValue = newValue;
      this.#stopAnimation();
      return;
    }

    const duration = this.#getAnimationDuration(keepProgress ? raw : 0, keepProgress ? progress : 0);
    if (keepProgress) alignItemsToProgress(this.#items, progress);
    this.#startAnimation(duration, keepProgress ? raw : 0);
  };

  render = () => {
    const progress = this.#state.progress;
    const isAnimating = this.#running || progress < 1;
    const blur = this.#getBlur();
    const items = this.#items.length
      ? this.#items
      : buildAnimPlan(getDigitSources(getValueText(this.value)), getValueText(this.value), false, this.#isRight);

    return html`
      ${items.map((item) => {
        if (item.kind === Kind.Separator) {
          return html`<span part=${DuoyunRollingNumberElement.separator} class="separator">${item.char}</span>`;
        }

        if (!isAnimating && item.isBlank) {
          return html``;
        }

        if (!isAnimating || item.fromOffset === item.toOffset) {
          return html`
            <span part=${DuoyunRollingNumberElement.digit} class="digit-container">
              <div class="digit-track">
                <span class="digit-char">${item.to}</span>
              </div>
            </span>
          `;
        }

        const offset = item.fromOffset + (item.toOffset - item.fromOffset) * progress;
        return html`
          <span part=${DuoyunRollingNumberElement.digit} class="digit-container">
            <div class="digit-track" style=${styleMap({ transform: `translateY(${-offset}em)`, filter: `blur(${blur}px)` })}>
              ${item.track.map(
                (d, index) => html`
                  <span class="digit-char" style=${styleMap({ opacity: String(getDigitOpacity(index, offset)) })}>${d || ' '}</span>
                `,
              )}
            </div>
          </span>
        `;
      })}
    `;
  };
}
