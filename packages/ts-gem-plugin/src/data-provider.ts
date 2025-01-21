import {
  getDefaultHTMLDataProvider,
  type IHTMLDataProvider,
  type IAttributeData,
} from '@mantou/vscode-html-languageservice';
import type * as ts from 'typescript/lib/tsserverlibrary';
import type { StringWeakMap } from 'duoyun-ui/lib/map';

import { isDepElement, isCustomElementTag, getAttrName } from './utils';

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
    return 'gem';
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
    if (!node) return [];
    const isDep = isDepElement(node);
    const result: IAttributeData[] = [];
    const props = typeChecker.getTypeAtLocation(node).getApparentProperties();
    // TODO: 完善
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
        case typeChecker.getStringType():
        case typeChecker.getNumberType():
          result.push({ name: e.name, description });
          break;
        case typeChecker.getBooleanType():
          result.push({ name: e.name, description, valueSet: 'v' });
          result.push({ name: `?${e.name}`, description });
          break;
      }
      if (getBasicUnionValues(declaration)) {
        result.push({ name: e.name, description });
      }
      if (typeText?.startsWith('Emitter')) {
        result.push({ name: `@${e.name}`, description });
      } else {
        result.push({ name: `.${e.name}`, description });
      }
    });
    const oResult = dataProvider.provideAttributes(isCustomElementTag(tag) ? 'div' : tag);
    oResult.forEach((data) => {
      const tryEvtName = data.name.replace(/^on/, '@');
      if (tryEvtName !== data.name) {
        result.push({ ...data, name: tryEvtName });
      }
    });
    return result;
  }

  provideValues(tag: string, attr: string) {
    const typeChecker = this.#getProgram().getTypeChecker();
    const node = this.#elements.get(tag);
    if (!node) return [];
    const prop = typeChecker.getTypeAtLocation(node).getProperty(getAttrName(attr).attr);
    const declaration = prop?.getDeclarations()?.at(0);
    const result = getBasicUnionValues(declaration);
    return result?.map((name) => ({ name })) || [];
  }
}

// TODO: use typeChecker
const STRING_REG = /("|')(?<str>.*)\1/;
function getBasicUnionValues(node?: ts.Node) {
  const typeText = (node as ts.PropertyDeclaration)?.type?.getText();
  if (!typeText) return;

  const result: string[] = [];
  for (const text of typeText.split('|')) {
    const t = text.trim();
    if (!t) continue;
    const number = Number(t);
    if (!Number.isNaN(number)) {
      result.push(t);
      continue;
    }
    const match = t.match(STRING_REG);
    if (!match) {
      // 有个元素不是字符串也不是数字
      return;
    }
    result.push(match.groups!.str);
  }
  if (result.length) return result;
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
