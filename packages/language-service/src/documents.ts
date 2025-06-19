import type { Stylesheet } from '@mantou/vscode-css-languageservice';
import type { HTMLDocument } from '@mantou/vscode-html-languageservice';
import { Cache } from 'duoyun-ui/lib/cache';
import Parser from 'tree-sitter';
import tsTypescript from 'tree-sitter-typescript';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { cssLanguageService, htmlLanguageService } from './global';

const language = tsTypescript.typescript as Parser.Language;

function processTemplate({ children }: Parser.SyntaxNode) {
  return {
    startIndex: children[1].startIndex,
    text: children
      .slice(1, -1)
      .reduce((p, c) => p + (c.type === 'template_substitution' ? c.text.replaceAll(/./g, '_') : c.text), ''),
  };
}

export class CSTDocs extends WeakMap<TextDocument, Parser.Tree> {
  #cssCache = new Cache<Stylesheet>({ max: 1000 });
  #htmlCache = new Cache<HTMLDocument>({ max: 1000 });

  getTypeScriptCST(textDocument: TextDocument) {
    const parser = new Parser();
    parser.setLanguage(language);

    const oldTree = this.get(textDocument);
    if (oldTree?.getText(oldTree.rootNode) === textDocument.getText()) return oldTree;

    const newTree = parser.parse(textDocument.getText());
    this.set(textDocument, newTree);

    return newTree;
  }

  getAllTemplate(textDocument: TextDocument, tag: string) {
    const tree = this.getTypeScriptCST(textDocument);
    const query = new Parser.Query(
      language,
      `
        (call_expression
          function: (identifier) @tag (#eq? @tag "${tag}")
          arguments: (template_string) @injection.content
        )
      `,
    );
    const matches = query.matches(tree.rootNode);
    const templateStrings = matches.map(({ captures }) => captures.pop()!.node);
    return templateStrings.map(processTemplate);
  }

  getStyles(textDocument: TextDocument) {
    const tree = this.getTypeScriptCST(textDocument);
    const query = new Parser.Query(
      language,
      `
        (call_expression
          function: (identifier) @_name (#eq? @_name "css")
          arguments: (arguments (object (pair
            value: (template_string) @injection.content
          )))
        )
      `,
    );
    const matches = query.matches(tree.rootNode);
    const templateStrings = matches.map(({ captures }) => captures.pop()!.node);
    return templateStrings.map(processTemplate);
  }

  getAllStyleValue(textDocument: TextDocument) {
    const tree = this.getTypeScriptCST(textDocument);
    const query = new Parser.Query(
      language,
      `
        (call_expression
          function: (identifier) @_name (#eq? @_name "styleMap")
          arguments: (arguments (object (pair
            value: (string (string_fragment) @injection.content)
          )))
        )
      `,
    );
    const matches = query.matches(tree.rootNode);
    return matches.map(({ captures }) => captures.pop()!.node);
  }

  getAllCSS(textDocument: TextDocument) {
    return this.getAllTemplate(textDocument, 'css').map((e) => {
      const doc = TextDocument.create(``, 'css', 1, e.text);
      const cssDoc = this.#cssCache.get(e.text, () => cssLanguageService.parseStylesheet(doc));
      return { ...e, doc, cssDoc };
    });
  }

  getAllCSSFragment(textDocument: TextDocument) {
    return [...this.getAllTemplate(textDocument, 'styled'), ...this.getStyles(textDocument)].map((e) => {
      const doc = TextDocument.create(``, 'css', 1, `.parent {${e.text}}`);
      const cssDoc = this.#cssCache.get(e.text, () => cssLanguageService.parseStylesheet(doc));
      return { ...e, startIndex: e.startIndex - 9, doc, cssDoc };
    });
  }

  getAllHTML(textDocument: TextDocument) {
    return this.getAllTemplate(textDocument, 'html').map((e) => {
      const doc = TextDocument.create(``, 'html', 1, e.text);
      const htmlDoc = this.#htmlCache.get(e.text, () => htmlLanguageService.parseHTMLDocument(doc));
      return { ...e, doc, htmlDoc };
    });
  }
}
