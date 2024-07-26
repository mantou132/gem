export type Maybe<T> = T | undefined | null;
export type StringList<T> = T | (string & Record<string, unknown>);

export type ElementOf<T> = T extends (infer E)[] ? E : never;
export type ValueOf<T> = T[keyof T];
export type Modify<T, R> = Omit<T, keyof R> & R;

export function isNullish<T>(v: T | undefined | null): v is null | undefined {
  return v === null || v === undefined;
}

// Array.filter type support
export function isNotNullish<T>(v: T | undefined | null): v is T {
  return !isNullish(v);
}

export function isNotString<T>(v: T | string): v is T {
  return typeof v !== 'string';
}

export function isNotBoolean<T>(v: T | boolean): v is T {
  return typeof v !== 'boolean';
}

export function isNotNumber<T>(v: T | number): v is T {
  return typeof v !== 'number';
}
