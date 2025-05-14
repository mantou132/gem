import { camelToKebabCase } from '@mantou/gem/lib/utils';
import {
  getDefaultHTMLDataProvider,
  type IAttributeData,
  type IHTMLDataProvider,
} from '@mantou/vscode-html-languageservice';
import type { StringWeakMap } from 'duoyun-ui/lib/map';
import type * as ts from 'typescript/lib/tsserverlibrary';

import { NAME } from './constants';
import { getAttrName, isDepElement } from './utils';

export const dataProvider = getDefaultHTMLDataProvider();

export class HTMLDataProvider implements IHTMLDataProvider {
  #ts: typeof ts;
  #elements: StringWeakMap<ts.ClassDeclaration>;
  #getProgram: () => ts.Program;

  constructor(typescript: typeof ts, elements: StringWeakMap<ts.ClassDeclaration>, getProgram: () => ts.Program) {
    this.#ts = typescript;
    this.#elements = elements;
    this.#getProgram = getProgram;
  }

  getId() {
    return NAME;
  }

  isApplicable() {
    return true;
  }

  provideTags() {
    return [...this.#elements].map(([tag, node]) => ({
      name: tag,
      attributes: [],
      description: getDocComment(this.#ts, node),
    }));
  }

  provideAttributes(tag: string) {
    const ts = this.#ts;
    const typeChecker = this.#getProgram().getTypeChecker();
    const node = this.#elements.get(tag);
    const result: IAttributeData[] = [
      { name: 'v-if', description: 'Similar to vue `v-if`' },
      { name: 'v-else-if', description: 'Similar to vue `v-else-if`' },
      { name: 'v-else', description: 'Similar to vue `v-else`', valueSet: 'v' },
    ];
    const builtInAttrsAndEvents = dataProvider
      .provideAttributes('div')
      .map((e) => ({ ...e, name: e.name.replace(/^on/, '@') }));
    // 未知元素
    if (!node) return [...result, ...builtInAttrsAndEvents];

    const isDep = isDepElement(node);
    const props = typeChecker.getTypeAtLocation(node).getApparentProperties();
    props.forEach((e) => {
      const declaration = e.getDeclarations()?.at(0);
      const prop = declaration && ts.isPropertyDeclaration(declaration);
      if (!prop) return;
      const hasPropDecorator = declaration.modifiers?.some((m) => ts.isDecorator(m) && ts.isIdentifier(m.expression));
      if (!hasPropDecorator && !isDep) return;
      const type = declaration.type && typeChecker.getTypeFromTypeNode(declaration.type);
      const typeText = declaration.type?.getText();
      const description = getDocComment(ts, declaration!);
      switch (type) {
        // 一般是 attribute
        case typeChecker.getStringType():
        case typeChecker.getNumberType():
          result.push({ name: e.name, description });
          break;
        // 一般是 boolean attribute
        case typeChecker.getBooleanType():
          result.push({ name: e.name, description, valueSet: 'v' });
          result.push({ name: `?${e.name}`, description });
          break;
        default: {
          // 一般是 attribute
          if (type && getUnionValues(type)) {
            result.push({ name: e.name, description });
          }
        }
      }
      if (typeText?.startsWith('Emitter')) {
        // 自定义事件
        result.push({ name: `@${camelToKebabCase(e.name)}`, description });
      } else {
        // 其他属性都能用 `.` 赋值
        result.push({ name: `.${e.name}`, description });
      }
    });
    // 添加原生全局事件
    result.push(...builtInAttrsAndEvents.filter((e) => e.name.startsWith('@')));
    return result;
  }

  provideValues(tag: string, attr: string) {
    const typeChecker = this.#getProgram().getTypeChecker();
    const node = this.#elements.get(tag);
    if (!node) return [];
    const prop = typeChecker.getTypeAtLocation(node).getProperty(getAttrName(attr).attr);
    const result = prop && getUnionValues(typeChecker.getTypeOfSymbol(prop));
    return result?.map((name) => ({ name })) || [];
  }
}

function getUnionValues(type: ts.Type) {
  if (!type.isUnion()) return;
  const result: string[] = [];
  type.types.forEach((e) => {
    if (!e.isLiteral()) return;
    result.push(String(e.value));
  });
  return result;
}

const COMMENT_LINE_CONTENT = /^(\/?[ *\t]*)?(?<str>.*?)(\**\/)?$/gm;
function getDocComment(typescript: typeof ts, declaration: ts.Node) {
  const fullText = declaration.getSourceFile().getFullText();
  const commentRanges = typescript.getLeadingCommentRanges(fullText, declaration.getFullStart());
  const commentStrings = commentRanges
    ?.filter(({ kind }) => kind === typescript.SyntaxKind.MultiLineCommentTrivia)
    .map(({ pos, end }) => {
      const fullComment = [...fullText.slice(pos, end).matchAll(COMMENT_LINE_CONTENT)];
      return fullComment.map((m) => m.groups!.str).join('\n');
    });
  return commentStrings?.join('\n\n');
}
