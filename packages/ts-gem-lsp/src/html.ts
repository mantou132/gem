import type {
  CompletionItem,
  CompletionList,
  Hover,
  HTMLDocument,
  IAttributeData,
  IHTMLDataProvider,
  ITagData,
  TextEdit,
} from '@mantou/vscode-html-languageservice';
import { getLanguageService } from '@mantou/vscode-html-languageservice';
import type { Project } from 'typescript/unstable/async';

import type { ElementIndex } from './elements';
import { getBuiltInAttributes, getElementData } from './elements';
import type { Template } from './template';

/** 从属性键值字符串上解析出不包含装饰符的名称 */
function getAttrName(text: string) {
  const attr = text.split('=')[0];
  return attr.charCodeAt(0) < 65 ? attr.slice(1) : attr;
}

/**
 * HTML 语言服务的数据提供者是同步的，TypeScript 7 API 是异步的，
 * 所以在调用语言服务前准备好当前元素的数据
 */
class TemplateDataProvider implements IHTMLDataProvider {
  tags: ITagData[] = [];
  attributes = new Map<string, IAttributeData[]>();
  values = new Map<string, Map<string, string[]>>();

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
    return (
      this.values
        .get(tag)
        ?.get(getAttrName(attr))
        ?.map((name) => ({ name })) ?? []
    );
  }
}

/**
 * `completionItem/resolve` 也会发给 TypeScript，使用 TypeScript 的数据格式避免其报错，
 * 名称加上前缀使 TypeScript 找不到对应的补全项而原样返回
 */
export interface GemCompletionData {
  fileName: string;
  position: number;
  name: string;
  gem: true;
}

export class HtmlService {
  #index: ElementIndex;
  #provider = new TemplateDataProvider();
  #ls = getLanguageService({ customDataProviders: [this.#provider] });

  constructor(index: ElementIndex) {
    this.#index = index;
  }

  /**
   * 异步获取数据，返回的函数同步设置数据提供者并调用语言服务，避免并发请求互相覆盖
   */
  async #prepare(project: Project, template: Template, offset: number) {
    const elements = await this.#index.get(project);
    const vHtml = this.#ls.parseHTMLDocument(template.doc);
    const { tag } = vHtml.findNodeAt(offset - template.start);
    const ref = tag ? elements.get(tag) : undefined;
    const data = ref && (await getElementData(project, ref));

    return <T>(fn: (vHtml: HTMLDocument) => T) => {
      this.#provider.tags = [...elements.keys()].map((name) => ({
        name,
        attributes: [],
        description: name === tag ? data?.description : undefined,
      }));
      this.#provider.attributes = new Map(tag && data ? [[tag, data.attributes]] : []);
      this.#provider.values = new Map(tag && data ? [[tag, data.values]] : []);
      return fn(vHtml);
    };
  }

  #translateTextEdit(template: Template, edit: TextEdit): TextEdit {
    return { newText: edit.newText, range: template.toRange(edit.range) };
  }

  #translateCompletionItem(template: Template, offset: number, item: CompletionItem): CompletionItem {
    const { textEdit, additionalTextEdits } = item;
    const data: GemCompletionData = {
      fileName: template.fileName,
      position: offset,
      name: `gem:${item.label}`,
      gem: true,
    };
    return {
      ...item,
      data,
      textEdit:
        textEdit && 'range' in textEdit
          ? this.#translateTextEdit(template, textEdit)
          : textEdit && {
              newText: textEdit.newText,
              insert: template.toRange(textEdit.insert),
              replace: template.toRange(textEdit.replace),
            },
      additionalTextEdits: additionalTextEdits?.map((edit) => this.#translateTextEdit(template, edit)),
    };
  }

  async complete(project: Project, template: Template, offset: number): Promise<CompletionList> {
    const use = await this.#prepare(project, template, offset);
    const list = use((vHtml) => this.#ls.doComplete(template.doc, template.toVirtualPosition(offset), vHtml));
    return { ...list, items: list.items.map((item) => this.#translateCompletionItem(template, offset, item)) };
  }

  async hover(project: Project, template: Template, offset: number): Promise<Hover | null> {
    const use = await this.#prepare(project, template, offset);
    const hover = use((vHtml) =>
      this.#ls.doHover(template.doc, template.toVirtualPosition(offset), vHtml, {
        documentation: true,
        references: true,
      }),
    );
    if (!hover) return null;
    return { ...hover, range: hover.range && template.toRange(hover.range) };
  }
}
