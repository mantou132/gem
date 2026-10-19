/** 行范围，例如 `2-3,-4--6,author-license`，支持负数（从末尾计算）和字符串匹配，返回合并后的 `[start, end]`，从 1 开始 */
export function getRanges(str: string, lines: string[]) {
  const len = lines.length;
  const findLineNumber = (s: string, start = 1) => {
    if (!s.trim()) return 0;
    return lines.findIndex((line, index) => index >= start - 1 && line.includes(s)) + 1;
  };
  const ranges = str.split(',').map((range) => {
    // 第二位可以省略，第一位不行，0 无意义，解析数字忽略空格，字符匹配包含空格
    // 3-4
    // 2 => 2-2
    // 2-2 => 2-2 // 使用字符串搜索时 end 大于 start
    // 2- => 2-max
    // -2 => (-2)-(-2)
    // -2- => (-2)-max
    // 2--2 => 2-(-2)
    // -3--2 => (-3)-(-2)
    const [startStr, endStr = startStr] = range.split(/(?<!-|^)-/);
    const start = Number(startStr) || findLineNumber(startStr) || 1;
    // 如果使用字符匹配，认为输入是严格顺序的，所以结束是在 start 后搜索
    const end = Number(endStr) || findLineNumber(endStr, endStr === startStr ? start : start + 1) || -1;
    // 包含首尾
    return [start < 0 ? len + start + 1 : start, end < 0 ? len + end + 1 : end || len].sort((a, b) => a - b);
  });
  const result: number[][] = [];
  ranges
    .sort((a, b) => a[0] - b[0])
    .forEach((range, index, arr) => {
      const prev = arr[index - 1];
      // 连号时并入前一个 range
      if (prev && prev[1] + 1 === range[0]) {
        prev[1] = range[1];
      } else {
        result.push(range);
      }
    });
  return result;
}

/** 按范围取出各部分的内容和行号 */
export function getParts(lines: string[], ranges: number[][]) {
  const lineNumbersParts = Array.from<unknown, number[]>(ranges, () => []);
  const parts = ranges.map(([start, end], index) => {
    return Array.from({ length: end - start + 1 }, (_, i) => {
      const j = start + i - 1;
      lineNumbersParts[index].push(j + 1);
      return lines[j];
    }).join('\n');
  });
  return { parts, lineNumbersParts };
}
