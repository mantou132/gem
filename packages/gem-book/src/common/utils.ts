export const CUSTOM_HEADING_REG = /^(.*?)\s*(?:{#(.*)})?$/s;

export function parseFilename(filename: string) {
  const [, rank, title] = filename.match(/^(\d*-)?(.*)/) || [];
  return { rank, title };
}

export function isIndexFile(filename: string) {
  return /^(index|readme)\.md$/i.test(filename);
}
