import { kebabToCamelCase } from '@mantou/gem/lib/utils';
import { doComplete as doEmmetComplete, updateTags as updateEmmetTags } from '@mantou/vscode-emmet-helper';
import type {
  CompletionList,
  Hover,
  HTMLDocument,
  IAttributeData,
  IHTMLDataProvider,
  ITagData,
} from '@mantou/vscode-html-languageservice';
import { getLanguageService } from '@mantou/vscode-html-languageservice';
import type { Node } from 'typescript/unstable/ast';
import type { Project } from 'typescript/unstable/async';
import { fileNameToDocumentURI } from 'typescript/unstable/async';
import type { DocumentHighlight, FoldingRange, LocationLink, Range } from 'typescript/unstable/vscode';

import type { GemConfiguration } from './configuration';
import type { CssService } from './css';
import type { ElementIndex } from './elements';
import { getBuiltInAttributes, getElementData, resolveElementType } from './elements';
import { getElementClass, getElementSelectors } from './styles';
import type { Template } from './template';
import { EmbeddedDocument, toPosition } from './template';
import { translateCompletionList, translateFoldingRange, translateHover } from './translate';

/** 从属性键值字符串上解析出不包含装饰符的名称 */
function getAttrName(text: string) {
  const attr = text.split('=')[0];
  return attr.charCodeAt(0) < 65 ? attr.slice(1) : attr;
}

export function toLocationLink(originSelectionRange: Range, node: Node): LocationLink {
  const file = node.getSourceFile();
  const name = (node as Node & { name?: Node }).name ?? node;
  const range = (n: Node) => ({
    start: toPosition(file.text, n.getStart(file)),
    end: toPosition(file.text, n.end),
  });
  return {
    originSelectionRange,
    targetUri: fileNameToDocumentURI(file.fileName),
    targetRange: range(node),
    targetSelectionRange: range(name),
  };
}

/**
 * HTML 语言服务的数据提供者是同步的，TypeScript 7 API 是异步的，
 * 所以在调用语言服务前准备好当前元素的数据
 */
class TemplateDataProvider implements IHTMLDataProvider {
  tags: ITagData[] = [];
  attributes = new Map<string, IAttributeData[]>();
  values = new Map<string, Map<string, string[]>>();
  /** 当前元素样式中的类名和 id */
  classes: string[] = [];
  ids: string[] = [];

  getId() {
    return 'gem';
  }

  isApplicable() {
    return true;
  }

  provideTags() {
    return this.tags;
  }

  provideAttributes(tag: string) {
    return this.attributes.get(tag) ?? getBuiltInAttributes();
  }

  provideValues(tag: string, attr: string) {
    const name = getAttrName(attr);
    if (name === 'class') return this.classes.map((value) => ({ name: value }));
    if (name === 'id') return this.ids.map((value) => ({ name: value }));
    return (
      this.values
        .get(tag)
        ?.get(getAttrName(attr))
        ?.map((name) => ({ name })) ?? []
    );
  }
}

export class HtmlService {
  #index: ElementIndex;
  #css: CssService;
  #provider = new TemplateDataProvider();
  #ls = getLanguageService({ customDataProviders: [this.#provider] });

  #getConfig: () => GemConfiguration;

  constructor(index: ElementIndex, css: CssService, getConfig: () => GemConfiguration) {
    this.#index = index;
    this.#css = css;
    this.#getConfig = getConfig;
  }

  /** 光标所在的 `<style>` 内容 */
  styleAt(template: Template, offset: number) {
    const vOffset = template.toVirtualOffset(offset);
    const node = this.#ls.parseHTMLDocument(template.doc).findNodeAt(vOffset);
    const { tag, startTagEnd, endTagStart } = node;
    if (tag !== 'style' || startTagEnd === undefined || endTagStart === undefined) return;
    if (vOffset < startTagEnd || vOffset > endTagStart) return;
    return new EmbeddedDocument(template, startTagEnd, endTagStart, 'css');
  }

  /** 模板中所有 `<style>` 的内容 */
  styles(template: Template) {
    const styles: EmbeddedDocument[] = [];
    const visit = (nodes: HTMLDocument['roots']) => {
      for (const { tag, startTagEnd, endTagStart, children } of nodes) {
        if (tag === 'style' && startTagEnd !== undefined && endTagStart !== undefined) {
          styles.push(new EmbeddedDocument(template, startTagEnd, endTagStart, 'css'));
        }
        visit(children);
      }
    };
    visit(this.#ls.parseHTMLDocument(template.doc).roots);
    return styles;
  }

  /**
   * 异步获取数据，返回的函数同步设置数据提供者并调用语言服务，避免并发请求互相覆盖
   */
  async #prepare(project: Project, template: Template, offset: number) {
    const elements = await this.#index.get(project);
    const vHtml = this.#ls.parseHTMLDocument(template.doc);
    const { tag } = vHtml.findNodeAt(template.toVirtualOffset(offset));
    const ref = tag ? elements.get(tag) : undefined;
    const element = getElementClass(template);
    const [data, selectors] = await Promise.all([
      ref && getElementData(project, ref),
      element ? getElementSelectors(project, element, this.#css) : [],
    ]);
    const names = [...new Set(selectors.map(({ name }) => name))];

    return <T>(fn: (vHtml: HTMLDocument, tags: string[]) => T) => {
      this.#provider.tags = [...elements.keys()].map((name) => ({
        name,
        attributes: [],
        description: name === tag ? data?.description : undefined,
      }));
      this.#provider.attributes = new Map(tag && data ? [[tag, data.attributes]] : []);
      this.#provider.values = new Map(tag && data ? [[tag, data.values]] : []);
      this.#provider.classes = names.filter((name) => !name.startsWith('#'));
      this.#provider.ids = names.filter((name) => name.startsWith('#')).map((name) => name.slice(1));
      return fn(vHtml, [...elements.keys()]);
    };
  }

  async complete(project: Project, template: Template, offset: number): Promise<CompletionList> {
    const style = this.styleAt(template, offset);
    if (style) return this.#css.complete(style, offset, [...(await this.#index.get(project)).keys()]);
    const use = await this.#prepare(project, template, offset);
    const position = template.toVirtualPosition(offset);
    const list = use((vHtml, tags) => {
      let emmet: CompletionList | undefined;
      const onHtmlContent = () => (emmet = doEmmetComplete(template.doc, position, 'html', this.#getConfig().emmet));
      this.#ls.setCompletionParticipants([{ onHtmlContent }]);
      updateEmmetTags(tags);
      const result = this.#ls.doComplete(template.doc, position, vHtml);
      return { ...result, items: [...result.items, ...(emmet?.items ?? [])] };
    });
    return translateCompletionList(template, offset, list);
  }

  async hover(project: Project, template: Template, offset: number): Promise<Hover | null> {
    const style = this.styleAt(template, offset);
    if (style) return this.#css.hover(style, offset);
    const use = await this.#prepare(project, template, offset);
    const hover = use((vHtml) =>
      this.#ls.doHover(template.doc, template.toVirtualPosition(offset), vHtml, {
        documentation: true,
        references: true,
      }),
    );
    return translateHover(template, hover);
  }

  /** 标签跳转到元素定义，属性跳转到属性定义，`v-else` 跳转到 `v-if` */
  async definition(project: Project, template: Template, offset: number): Promise<LocationLink[] | null> {
    const vOffset = template.toVirtualOffset(offset);
    const vHtml = this.#ls.parseHTMLDocument(template.doc);
    const node = vHtml.findNodeAt(vOffset);
    const { tag, startTagEnd } = node;
    if (!tag || startTagEnd === undefined || vOffset > startTagEnd) return null;

    const tagStart = node.start + 1;
    if (vOffset <= tagStart + tag.length) {
      const elementType = await resolveElementType(project, template.file, await this.#index.get(project), tag);
      const declaration = await elementType?.symbol?.declarations[0]?.resolve(project);
      if (!declaration) return null;
      return [toLocationLink(template.toRangeFromOffsets(tagStart, tagStart + tag.length), declaration)];
    }

    const attrEntry = [...node.attributesMap].find(([, { start, end }]) => vOffset >= start && vOffset <= end);
    if (!attrEntry) return null;
    const [attrName, { end: attrEnd }] = attrEntry;
    const attr = getAttrName(attrName);
    const origin = template.toRangeFromOffsets(attrEnd - attr.length, attrEnd);

    if (attr === 'v-else' || attr === 'v-else-if') {
      const siblings = node.parent?.children ?? vHtml.roots;
      const prev = siblings[siblings.indexOf(node) - 1];
      const ifAttr = prev?.attributesMap.get('v-if') ?? prev?.attributesMap.get('v-else-if');
      if (!ifAttr) return null;
      return [
        {
          originSelectionRange: origin,
          targetUri: fileNameToDocumentURI(template.fileName),
          targetRange: template.toRangeFromOffsets(ifAttr.start, ifAttr.end),
          targetSelectionRange: template.toRangeFromOffsets(ifAttr.start, ifAttr.end),
        },
      ];
    }

    const elementType = await resolveElementType(project, template.file, await this.#index.get(project), tag);
    const prop = await elementType?.type.getProperty(kebabToCamelCase(attr));
    const declaration = await prop?.declarations[0]?.resolve(project);
    if (!declaration) return null;
    return [toLocationLink(origin, declaration)];
  }

  /** 匹配的开始和结束标签 */
  highlights(template: Template, offset: number): DocumentHighlight[] {
    const vHtml = this.#ls.parseHTMLDocument(template.doc);
    const highlights = this.#ls.findDocumentHighlights(template.doc, template.toVirtualPosition(offset), vHtml);
    return highlights.map(({ range, kind }) => ({ range: template.toRange(range), kind }));
  }

  /** 同时编辑开始和结束标签名 */
  linkedEditingRanges(template: Template, offset: number): Range[] | undefined {
    const vHtml = this.#ls.parseHTMLDocument(template.doc);
    const ranges = this.#ls.findLinkedEditingRanges(template.doc, template.toVirtualPosition(offset), vHtml);
    return ranges?.map((range) => template.toRange(range));
  }

  /** 输入 `>` 后自动插入结束标签，返回代码片段 */
  closingTag(template: Template, offset: number) {
    const vHtml = this.#ls.parseHTMLDocument(template.doc);
    const snippet = this.#ls.doTagComplete(template.doc, template.toVirtualPosition(offset), vHtml);
    if (!snippet) return;
    const position = template.toVirtualPosition(offset);
    return { newText: snippet, range: template.toRange({ start: position, end: position }) };
  }

  foldingRanges(template: Template): FoldingRange[] {
    return this.#ls.getFoldingRanges(template.doc).map((range) => translateFoldingRange(template, range));
  }
}
