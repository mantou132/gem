import { proxyObject } from './utils';
import { isNotBoolean } from './types';

export type Key = {
  win?: string;
  mac?: string;
  macSymbol?: string;
  alias?: string;
  symbol?: string;
};

type NormalizeKey = string;

/**
 * @see
 * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
 */
export function normalizeKey(code: string): NormalizeKey {
  const s = code.toLowerCase();
  if (s.startsWith('control')) return 'ctrl';
  if (s.startsWith('meta') || s === 'command' || s.startsWith('os')) return 'meta';
  if (s.startsWith('shift')) return 'shift';
  if (s.startsWith('alt') || s === 'option') return 'alt';
  return s.replace(/^(digit|key|numpad)/, '');
}

function appendToMap(keys: Record<NormalizeKey, Key>) {
  Object.entries(keys).forEach(([named, key]) => {
    Object.entries(key).forEach(([_, k]) => {
      map[k] = named;
    });
  });
}

const keys: Record<NormalizeKey, Key> = {
  ctrl: {
    alias: 'control',
    macSymbol: '⌃',
  },
  meta: {
    win: 'win',
    mac: 'command',
    macSymbol: '⌘',
  },
  shift: {
    symbol: '⇧',
  },
  alt: {
    mac: 'option',
    macSymbol: '⌥',
  },
  escape: {
    alias: 'esc',
  },
  backspace: {
    symbol: '⌫',
  },
  enter: {
    alias: 'return',
    symbol: '↵',
  },
  space: {
    symbol: '␣',
  },
  capsLock: {
    symbol: '⇪',
  },
  arrowdown: {
    alias: 'down',
    symbol: '↓',
  },
  arrowup: {
    alias: 'up',
    symbol: '↑',
  },
  arrowleft: {
    alias: 'left',
    symbol: '←',
  },
  arrowright: {
    alias: 'right',
    symbol: '→',
  },
  minus: {
    symbol: '-',
  },
  equal: {
    symbol: '=',
  },
  period: {
    symbol: '.',
  },
  comma: {
    symbol: ',',
  },
  slash: {
    symbol: '/',
  },
  backslash: {
    symbol: '|',
  },
  bracketleft: {
    symbol: '[',
  },
  bracketright: {
    symbol: ']',
  },
  semicolon: {
    symbol: ';',
  },
  quote: {
    symbol: "'",
  },
  backquote: {
    symbol: '`',
  },
};

const map: Record<string, NormalizeKey> = proxyObject({});

appendToMap(keys);

export const isMac = navigator.platform.includes('Mac');

/**Get the platform button */
export function getDisplayKey(code: string, type?: keyof Key) {
  const key = normalizeKey(code);
  const keyObj = keys[key];
  let result: string | undefined = undefined;
  if (!keyObj) {
    result = key;
  } else if (type) {
    result = keyObj[type];
  }
  if (!result) {
    result = (isMac ? keyObj['macSymbol'] || keyObj['mac'] : keyObj['win']) || keyObj['symbol'] || key;
  }
  return result.replace(/^(.)/, (_substr, $1: string) => $1.toUpperCase());
}

/**Custom key map */
export function setKeys(keysRecord: Record<NormalizeKey, Key>) {
  Object.assign(keys, keysRecord);
  appendToMap(keysRecord);
}

const hotkeySplitter = /,(?!,)/;
// https://bugs.webkit.org/show_bug.cgi?id=174931
// const keySplitter = /(?<!\+)\+/;
const keySplitter = /\+/;

/**Detect whether the current keyboard event matches the specified button */
export function matchHotKey(evt: KeyboardEvent, hotkey: string) {
  const keys = hotkey.split(keySplitter).map((k) => map[k]);

  const targetKeyEvent = { ctrl: false, meta: false, shift: false, alt: false, namedKey: '' };

  keys.forEach((named) => {
    switch (named) {
      case 'ctrl':
        return (targetKeyEvent.ctrl = true);
      case 'meta':
        return (targetKeyEvent.meta = true);
      case 'shift':
        return (targetKeyEvent.shift = true);
      case 'alt':
        return (targetKeyEvent.alt = true);
      default:
        return (targetKeyEvent.namedKey = named);
    }
  });

  let nextKey = '';
  if (targetKeyEvent.namedKey.length > 2 && targetKeyEvent.namedKey.includes('-')) {
    // not support `a--`, `--a`, `a--b`, only allow `a-b`
    [targetKeyEvent.namedKey, nextKey] = [...targetKeyEvent.namedKey.split('-')];
  }

  const match =
    evt.ctrlKey === targetKeyEvent.ctrl &&
    evt.metaKey === targetKeyEvent.meta &&
    evt.shiftKey === targetKeyEvent.shift &&
    evt.altKey === targetKeyEvent.alt &&
    (!targetKeyEvent.namedKey ||
      normalizeKey(evt.code) === targetKeyEvent.namedKey ||
      /**
       * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
       */
      evt.key.toLowerCase() === targetKeyEvent.namedKey);

  return nextKey ? match && nextKey : match;
}

export type HotKeyHandles = {
  onLock?: (evt: KeyboardEvent) => void;
  onUnlock?: (evt: KeyboardEvent) => void;
  onUncapture?: (evt: KeyboardEvent) => void;
  [index: string]: ((evt: KeyboardEvent) => void) | undefined;
};

let locked = false;
const unlockCallback = new Set<() => void>();

/**Release the lock state of the continuous button, see `hotkeys` */
export function unlock() {
  locked = false;
  unlockCallback.forEach((callback) => callback());
  unlockCallback.clear();
}

/**
 * Must have non-control character;
 * Not case sensitive;
 * Support `a-b`, press `a`, hotkeys be locked, wait next `keydown` event, allow call `unlock`
 */
export function hotkeys(handles: HotKeyHandles) {
  return function (evt: KeyboardEvent) {
    if (evt.isComposing) return;
    if (locked) return;

    let captured = false;
    const nextKeyHandleSet = new Map<string, Set<(evt: KeyboardEvent) => void>>();

    for (const str in handles) {
      const handle = handles[str];
      if (!handle) break;

      const shortcuts = str.split(hotkeySplitter).map((e) => e.trim());
      const matchResult = shortcuts.map((hotkey) => matchHotKey(evt, hotkey));
      if (matchResult.some((r) => r === true)) {
        captured = true;
        handle(evt);
      }
      matchResult.filter(isNotBoolean).forEach((key) => {
        const set = nextKeyHandleSet.get(key) || new Set<(evt: KeyboardEvent) => void>();
        set.add(handle);
        nextKeyHandleSet.set(key, set);
      });
    }

    if (nextKeyHandleSet.size) {
      captured = true;
      unlockCallback.clear();
      handles.onLock?.(evt);
      locked = true;

      const nextKeyHandle = (evt: KeyboardEvent) => {
        handles.onUnlock?.(evt);
        locked = false;
        evt.stopPropagation();
        evt.preventDefault();

        let nextKeyCaptured = false;

        nextKeyHandleSet.forEach((handleSet, k) => {
          if (matchHotKey(evt, k)) {
            nextKeyCaptured = true;
            handleSet.forEach((h) => h(evt));
          }
        });

        if (!nextKeyCaptured) handles.onUncapture?.(evt);
      };

      unlockCallback.add(() => removeEventListener('keydown', nextKeyHandle, { capture: true }));
      addEventListener('keydown', nextKeyHandle, { once: true, capture: true });
    }

    if (!captured) handles.onUncapture?.(evt);
  };
}

/**
 * Support space,enter
 */
export const commonHandle = hotkeys({
  'space,enter': (evt) => {
    (evt.target as HTMLElement).click();
    evt.preventDefault();
  },
  esc: (evt) => {
    (evt.target as HTMLElement).blur();
    evt.preventDefault();
  },
});
