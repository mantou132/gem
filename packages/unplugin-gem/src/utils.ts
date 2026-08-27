export const toArray = <T>(value: T | T[] | undefined) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export const cleanId = (id: string) => id.replace(/[?#].*$/, '');

export const matchesFilter = (id: string, pattern: string | RegExp) => {
  if (typeof pattern === 'string') return id.includes(pattern);
  pattern.lastIndex = 0;
  const result = pattern.test(id);
  pattern.lastIndex = 0;
  return result;
};
