export const NAME = 'gem-plugin';

export const HTML_SUBSTITUTION_CHAR = '_';

export enum DiagnosticCode {
  UnknownTag = 101,
  UnknownProp,
  PropTypeError,
  PropSyntaxError,
  Deprecated,
  NoStyleTag,
  DecoratorSyntaxError,
  SuggestionClassName,
  SuggestionPropOptional,
  SuggestionPropName,
  // 其他 code 会被 ts 忽略，不会触发代码修复
  AttrFormatError = 2552,
}

export const Decorators = {
  Attr: 'attribute',
  NumAttr: 'numattribute',
  BoolAttr: 'boolattribute',
  Prop: 'property',
  Emitter: 'emitter',
  GlobalEmitter: 'globalemitter',
  AdoptedStyle: 'adoptedStyle',
  Shadow: 'shadow',
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
