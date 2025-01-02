import type * as ts from 'typescript/lib/tsserverlibrary';

export class Utils {
  #ts: typeof ts;

  constructor(typescript: typeof ts) {
    this.#ts = typescript;
  }

  getAstNodeAtPosition(node: ts.Node, pos: number) {
    if (node.pos > pos || node.end <= pos) return;
    while (node.kind >= this.#ts.SyntaxKind.FirstNode) {
      const nested = this.#ts.forEachChild(node, (child) => (child.pos <= pos && child.end > pos ? child : undefined));
      if (nested === undefined) break;
      node = nested;
    }
    return node;
  }
}

const marker = Symbol();

export function decorate<T>(origin: T, fn: (o: T) => T): T {
  if ((origin as any)[marker]) return origin;
  const result = fn(origin);
  (result as any)[marker] = true;
  return result;
}
