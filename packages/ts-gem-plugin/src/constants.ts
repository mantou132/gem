export const NAME = 'gem-plugin';

export enum DiagnosticCode {
  UnknownTag = 101,
  UnknownProp,
  PropTypeError,
  PropSyntaxError,
  Deprecated,
  // 其他 code 会被 ts 忽略，不会触发代码修复
  AttrFormatError = 2552,
}
