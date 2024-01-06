export function parseTitle(fullText: string) {
  const [, text, customId] = fullText.match(/^(.*?)\s*(?:{#(.*)})?$/s)!;
  return { text, customId };
}

export function normalizeId(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replaceAll('<', '').replaceAll('>', '');
}

export function parseFilename(filename: string) {
  const [, rank, title] = filename.match(/^(\d*-)?(.*)/) || [];
  return { rank, title };
}

export function isIndexFile(filename: string) {
  return /^(index|readme)\.md$/i.test(filename);
}
