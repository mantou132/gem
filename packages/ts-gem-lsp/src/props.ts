import { camelToKebabCase } from '@mantou/gem/lib/utils';
import type { Node as HtmlNode } from '@mantou/vscode-html-languageservice';
import { getLanguageService } from '@mantou/vscode-html-languageservice';
import type { ClassDeclaration, Identifier, PropertyDeclaration, SourceFile } from 'typescript/unstable/ast';
import { getTokenAtPosition, isClassDeclaration, isIdentifier, isPropertyDeclaration } from 'typescript/unstable/ast';
import type { Project } from 'typescript/unstable/async';
import { fileNameToDocumentURI } from 'typescript/unstable/async';
import type { Location, TextEdit } from 'typescript/unstable/vscode';

import type { ElementIndex } from './elements';
import { getDecoratorNames, getTagFromDecorator, resolveElementType } from './elements';
import { getProjectFiles } from './tags';
import { findTemplates } from './template';

const htmlLs = getLanguageService();

const ATTRIBUTE_DECORATORS = ['attribute', 'numattribute', 'boolattribute', 'property'];
const EMITTER_DECORATORS = ['emitter', 'globalemitter'];

/** 模板中绑定属性的写法：装饰符和名称 */
type AttrForm = [decorate: string, name: string];

export interface ElementProp {
  name: Identifier;
  element: ClassDeclaration;
  forms: AttrForm[];
}

function getAttrForms(name: string, decorators: string[]): AttrForm[] {
  const kebab = camelToKebabCase(name);
  if (decorators.some((d) => EMITTER_DECORATORS.includes(d))) return [['@', kebab]];
  if (decorators.some((d) => ATTRIBUTE_DECORATORS.includes(d))) {
    return [
      ['', kebab],
      ['?', kebab],
      ['.', name],
    ];
  }
  return [];
}

/** 光标处元素类中被装饰的属性名 */
export function findElementProp(file: SourceFile, offset: number): ElementProp | undefined {
  const token = getTokenAtPosition(file, offset);
  const decl = token.parent;
  if (!isIdentifier(token) || !decl || !isPropertyDeclaration(decl) || decl.name !== token) return;
  const element = decl.parent;
  if (!isClassDeclaration(element) || !getTagFromDecorator(element)) return;
  const forms = getAttrForms(token.text, getDecoratorNames(decl as PropertyDeclaration));
  return forms.length ? { name: token, element, forms } : undefined;
}

/** 继承该元素类的元素也有该属性 */
async function getElementTags(project: Project, element: ClassDeclaration, index: ElementIndex) {
  const { checker } = project;
  const file = element.getSourceFile();
  const elementType = await checker.getTypeAtLocation(element.name ?? element);
  const elements = await index.get(project);
  const tags = await Promise.all(
    [...elements.keys()].map(async (tag) => {
      const type = await resolveElementType(project, file, elements, tag);
      return type && (await checker.isTypeAssignableTo(type.type, elementType)) ? tag : undefined;
    }),
  );
  return new Set(tags.filter((tag) => tag !== undefined));
}

function forEachHtmlNode(nodes: HtmlNode[], fn: (node: HtmlNode) => void) {
  for (const node of nodes) {
    fn(node);
    forEachHtmlNode(node.children, fn);
  }
}

/** 模板中绑定该属性的地方，范围不包含装饰符 */
export async function findPropAttributes(project: Project, prop: ElementProp, index: ElementIndex) {
  const tags = await getElementTags(project, prop.element, index);
  const result: (Location & { form: AttrForm })[] = [];
  for (const file of await getProjectFiles(project)) {
    const uri = fileNameToDocumentURI(file.fileName);
    for (const template of findTemplates(file, 'html')) {
      forEachHtmlNode(htmlLs.parseHTMLDocument(template.doc).roots, (node) => {
        if (!node.tag || !tags.has(node.tag)) return;
        for (const form of prop.forms) {
          const [decorate, name] = form;
          const info = node.attributesMap.get(decorate + name);
          if (!info) continue;
          result.push({ uri, form, range: template.toRangeFromOffsets(info.start + decorate.length, info.end) });
        }
      });
    }
  }
  return result;
}

/** 重命名属性时模板中的修改，特性名使用烤串式格式 */
export function getPropRenameEdits(attributes: Awaited<ReturnType<typeof findPropAttributes>>, newName: string) {
  const changes: Record<string, TextEdit[]> = {};
  for (const { uri, range, form } of attributes) {
    const newText = form[0] === '.' ? newName : camelToKebabCase(newName);
    (changes[uri] ??= []).push({ range, newText });
  }
  return changes;
}
