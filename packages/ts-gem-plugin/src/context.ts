import type { Logger, TemplateSettings } from '@mantou/typescript-template-language-service-decorator';
import StandardScriptSourceHelper from '@mantou/typescript-template-language-service-decorator/lib/standard-script-source-helper';
import StandardTemplateSourceHelper from '@mantou/typescript-template-language-service-decorator/lib/standard-template-source-helper';
import type { LanguageService as CssLS, Node as CssNode, Stylesheet } from '@mantou/vscode-css-languageservice';
import { getCSSLanguageService, NodeType } from '@mantou/vscode-css-languageservice';
import type { HTMLDocument, IHTMLDataProvider, LanguageService, Node } from '@mantou/vscode-html-languageservice';
import { getLanguageService as getHTMLanguageService, TextDocument } from '@mantou/vscode-html-languageservice';
import { StringWeakMap } from 'duoyun-ui/lib/map';
import type * as ts from 'typescript/lib/tsserverlibrary';

import { LRUCache } from './cache';
import type { Configuration } from './configuration';
import { dataProvider, HTMLDataProvider } from './data-provider';
import { forEachNode, getAllIdent, getIdentAtPosition, getTagFromNodeWithDecorator, isDepElement } from './utils';

declare module '@mantou/vscode-html-languageservice' {
  interface Node {
    prev?: Node;
    next?: Node;
  }
}

class NodeMap<T> {
  #map: Record<string, T[] | undefined> = {};
  get(key: string) {
    return this.#map[key];
  }
  add(key: string, value: T) {
    if (!this.#map[key]) this.#map[key] = [];
    this.#map[key].push(value);
  }
}

/**
 * 全局上下文，数据共享
 */
export class Context {
  elements: StringWeakMap<ts.ClassDeclaration>;
  builtInElements: StringWeakMap<ts.InterfaceDeclaration>;
  ts: typeof ts;
  config: Configuration;
  project: ts.server.Project;
  logger: Logger;
  dataProvider: IHTMLDataProvider;
  cssLanguageService: CssLS;
  htmlLanguageService: LanguageService;
  htmlSourceHelper: StandardTemplateSourceHelper;
  cssSourceHelper: StandardTemplateSourceHelper;
  htmlTemplateStringSettings: TemplateSettings;
  cssTemplateStringSettings: TemplateSettings;
  getProgram: () => ts.Program;

  constructor(typescript: typeof ts, config: Configuration, info: ts.server.PluginCreateInfo, logger: Logger) {
    this.ts = typescript;
    this.config = config;
    this.getProgram = () => info.languageService.getProgram()!;
    this.project = info.project;
    this.logger = logger;
    this.dataProvider = dataProvider;
    this.elements = new StringWeakMap();
    this.builtInElements = new StringWeakMap();
    this.cssLanguageService = getCSSLanguageService({});
    this.htmlLanguageService = getHTMLanguageService({
      customDataProviders: [dataProvider, new HTMLDataProvider(typescript, this.elements, this.getProgram)],
    });
    this.htmlTemplateStringSettings = {
      tags: ['html', 'raw', 'h'],
      enableForStringWithSubstitutions: true,
      getSubstitution,
    };
    this.cssTemplateStringSettings = {
      tags: ['styled', 'css'],
      enableForStringWithSubstitutions: true,
      getSubstitution,
      isValidTemplate: (node) => isValidCSSTemplate(typescript, node, 'css'),
    };
    this.htmlSourceHelper = new StandardTemplateSourceHelper(
      typescript,
      this.htmlTemplateStringSettings,
      new StandardScriptSourceHelper(typescript, info.project),
      logger,
    );
    this.cssSourceHelper = new StandardTemplateSourceHelper(
      typescript,
      this.cssTemplateStringSettings,
      new StandardScriptSourceHelper(typescript, info.project),
      logger,
    );
  }

  #virtualCssCache = new LRUCache<{
    vDoc: TextDocument;
    vCss: Stylesheet;
    tagNodeMap: NodeMap<CssNode>;
    classIdNodeMap: NodeMap<CssNode>;
    customPropNodeMap: NodeMap<CssNode>;
  }>({ max: 1000 });
  getCssDoc(text: string) {
    return this.#virtualCssCache.get({ text, fileName: '' }, undefined, () => {
      const vDoc = createVirtualDocument('css', text);
      const vCss = this.cssLanguageService.parseStylesheet(vDoc);
      const tagNodeMap = new NodeMap<CssNode>();
      const classIdNodeMap = new NodeMap<CssNode>();
      const propNodeMap = new NodeMap<CssNode>();
      forEachNode(vCss.getChildren(), (node) => {
        if (node.type === NodeType.ElementNameSelector) {
          tagNodeMap.add(node.getText(), node);
        }
        if (node.type === NodeType.IdentifierSelector || node.parent?.type === NodeType.ClassSelector) {
          classIdNodeMap.add(node.getText(), node);
        }
        if (node.parent?.type === NodeType.CustomPropertyDeclaration) {
          propNodeMap.add(node.getText(), node);
        }
      });
      return { vDoc, vCss, tagNodeMap, classIdNodeMap, customPropNodeMap: propNodeMap };
    });
  }

  #virtualHtmlCache = new LRUCache<{
    vDoc: TextDocument;
    vHtml: HTMLDocument;
    tagNodeMap: NodeMap<Node>;
    classIdNodeMap: NodeMap<{ start: number; length: number }>;
  }>({ max: 1000 });
  getHtmlDoc(text: string) {
    return this.#virtualHtmlCache.get({ text, fileName: '' }, undefined, () => {
      const vDoc = createVirtualDocument('html', text);
      const vHtml = this.htmlLanguageService.parseHTMLDocument(vDoc);
      const tagNodeMap = new NodeMap<Node>();
      const classIdNodeMap = new NodeMap<{ start: number; length: number }>();
      vHtml.roots.forEach(function process(e, index, arr) {
        e.prev = arr[index - 1];
        e.next = arr[index + 1];
        e.tag && tagNodeMap.add(e.tag, e);
        const idAttr = e.attributesMap.get('id');
        const classAttr = e.attributesMap.get('class');
        if (idAttr?.value) {
          const text = getIdentAtPosition(idAttr.value, 1);
          if (text) {
            classIdNodeMap.add(`#${text.text}`, {
              start: idAttr.end + 1 + text.start,
              length: text.length,
            });
          }
        }
        if (classAttr?.value) {
          getAllIdent(classAttr.value).forEach((text) => {
            classIdNodeMap.add(text.value, {
              start: classAttr.end + 1 + text.start,
              length: text.length,
            });
          });
        }
        e.children.forEach(process);
      });
      return { vDoc, vHtml, tagNodeMap, classIdNodeMap };
    });
  }

  getTagFromNode(node: ts.Node, supportClassName = isDepElement(node)) {
    if (!this.ts.isClassDeclaration(node)) return;

    const tag = getTagFromNodeWithDecorator(this.ts, node);
    if (tag) return tag;

    // 只有声明文件
    if (supportClassName && node.name && this.ts.isIdentifier(node.name)) {
      return this.config.elementDefineRules.findTag(node.name.text);
    }
  }

  updateElement(file: ts.SourceFile) {
    // 可能修改了 tag ，应该立刻清理
    for (const [tag, decl] of this.elements) {
      if (decl.getSourceFile().fileName === file.fileName) {
        // duoyun-ui 2.2.2
        (this.elements as any).delete?.(tag);
      }
    }

    const isDep = isDepElement(file);
    // 只支持顶级 class 声明
    this.ts.forEachChild(file, (node) => {
      const tag = this.getTagFromNode(node, isDep);
      if (tag && this.ts.isClassDeclaration(node)) {
        this.elements.set(tag, node);
      }
    });
  }

  #initElementsCache = new WeakSet<ts.server.Project>();
  /**
   * 当 project 准备好了执行
   */
  initElements() {
    const program = this.getProgram();
    if (this.#initElementsCache.has(this.project)) return;
    this.#initElementsCache.add(this.project);
    const files = program.getSourceFiles();
    files.forEach((file) => this.updateElement(file));

    // 内置元素接口
    const typeChecker = program.getTypeChecker();
    const symbols = typeChecker.getSymbolsInScope(files.at(0)!, this.ts.SymbolFlags.Interface);
    symbols.forEach((symbol) => {
      const name = symbol.escapedName.toString();
      const match = name.match(/^(SVG|HTML)(\w*)Element$/);
      const declaration = symbol.declarations?.find((e) => this.ts.isInterfaceDeclaration(e));
      if (!match || !declaration) return;
      if (name in partialBuiltInElementMap) {
        partialBuiltInElementMap[name].forEach((e) => this.builtInElements.set(e, declaration));
      } else {
        this.builtInElements.set(match[2].toLowerCase(), declaration);
      }
    });
  }
}

const partialBuiltInElementMap: Record<string, string[]> = {
  HTMLDListElement: ['dl'],
  HTMLOListElement: ['ol'],
  HTMLUListElement: ['ul'],
  HTMLHeadingElement: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  HTMLModElement: ['del', 'ins'],
  HTMLQuoteElement: ['blockquote', 'q', 'cite'],
  HTMLTableCaptionElement: ['caption'],
  HTMLTableCellElement: ['th', 'td'],
  HTMLTableColElement: ['col'],
  HTMLTableRowElement: ['tr'],
  HTMLTableSectionElement: ['thead', 'tfoot', 'tbody'],
  // 和 svg 同名元素使用 html 元素对待
  SVGAElement: [],
  HTMLAnchorElement: ['a'],
  SVGImageElement: [],
  HTMLImageElement: ['img'],
  SVGStyleElement: [],
  HTMLStyleElement: ['style'],
  SVGScriptElement: [],
  HTMLScriptElement: ['script'],
  SVGTitleElement: [],
  HTMLTitleElement: ['title'],
};

function createVirtualDocument(languageId: string, content: string) {
  return TextDocument.create(`embedded://document.${languageId}`, languageId, 1, content);
}

function getSubstitution(templateString: string, start: number, end: number) {
  return templateString.slice(start, end).replaceAll(/[^\n]/g, '_');
}

function isValidCSSTemplate(
  typescript: typeof ts,
  node: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression | ts.TaggedTemplateExpression,
  callName: string,
) {
  switch (node.kind) {
    case typescript.SyntaxKind.NoSubstitutionTemplateLiteral:
    case typescript.SyntaxKind.TemplateExpression: {
      const parent = node.parent;
      if (typescript.isCallExpression(parent) && parent.expression.getText() === callName) {
        return true;
      }
      if (typescript.isPropertyAssignment(parent)) {
        const call = parent.parent.parent;
        if (typescript.isCallExpression(call) && call.expression.getText() === callName) {
          return true;
        }
      }
      return false;
    }
    default:
      return false;
  }
}
