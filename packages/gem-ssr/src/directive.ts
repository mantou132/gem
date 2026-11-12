// 服务端和客户端共享

type DirectiveResult = {
  _$litDirective$: new (partInfo: object) => { render(...values: unknown[]): unknown };
  values: unknown[];
};

export const childPartInfo = { type: 2 };

const isDirectiveResult = (value: unknown): value is DirectiveResult =>
  !!value && typeof value === 'object' && '_$litDirective$' in value;

/** 指令的值使用 `render` 的结果，服务端渲染和水合时使用，例如 `keyed` 渲染其中的模板 */
export function resolveDirective(value: unknown, partInfo: object): unknown {
  if (!isDirectiveResult(value)) return value;
  const directive = new value._$litDirective$(partInfo);
  return resolveDirective(directive.render(...value.values), partInfo);
}
