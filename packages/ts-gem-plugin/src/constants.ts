export const NAME = 'gem-plugin';

export enum DiagnosticCode {
  UnknownTag = 101,
  UnknownProp,
  PropTypeError,
  PropSyntaxError,
  Deprecated,
  // 其他 code 会被 ts 忽略，不会触发代码修复
  AttrFormatError = 2552,
  DecoratorSyntaxError = 2552,
}

export const Decorators = {
  Attr: 'attribute',
  NumAttr: 'numattribute',
  BoolAttr: 'boolattribute',
  Prop: 'property',
  Emitter: 'emitter',
  GlobalEmitter: 'globalemitter',
  AdoptedStyle: 'adoptedStyle',
  CustomElement: 'customElement',
  Part: 'part',
  Slot: 'slot',
};

export const Utils = {
  ClassMap: 'classMap',
  CreateDecoratorTheme: 'createDecoratorTheme',
};

export const Types = {
  Emitter: 'Emitter',
};
