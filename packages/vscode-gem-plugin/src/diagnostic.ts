// 只对 CSS 语法和属性做了简单的检查，不做值检查
// TODO: 激活扩展、打开工作区时需要自动诊断所有文件
// TODO: 使用 LRU 缓存

// eslint-disable-next-line import/no-unresolved
import { workspace, languages, window, Range, Diagnostic } from 'vscode';
import { getCSSLanguageService as getCSSLanguageService } from 'vscode-css-languageservice';
import type { ExtensionContext, TextDocument } from 'vscode';
import { debounce } from 'duoyun-ui/lib/timer';

import { CSS_REG, LANG_SELECTOR, STYLE_REG } from './constants';
import { createVirtualDocument, removeSlot } from './util';

const diagnosticCollection = languages.createDiagnosticCollection('gem');
const cssLanguageService = getCSSLanguageService();

const updateDiagnostic = debounce((document: TextDocument) => {
  if (!LANG_SELECTOR.includes(document.languageId)) return;
  const diagnostics: Diagnostic[] = [];
  const text = document.getText();

  const matchFragments = (regexp: RegExp, appendBefore: string, appendAfter: string) => {
    regexp.exec('null');

    let match;
    while ((match = regexp.exec(text))) {
      const matchContent = match.groups!.content;
      const offset = match.index + match.groups!.start.length;
      const virtualDocument = createVirtualDocument('css', `${appendBefore}${removeSlot(matchContent)}${appendAfter}`);
      const vCss = cssLanguageService.parseStylesheet(virtualDocument);
      const oDiagnostics = cssLanguageService.doValidation(virtualDocument, vCss) as Diagnostic[];
      for (const { message, range } of oDiagnostics) {
        const { start, end } = range;
        const startOffset = virtualDocument.offsetAt(start) - appendBefore.length + offset;
        const endOffset = virtualDocument.offsetAt(end) - appendBefore.length + offset;
        const nRange = new Range(document.positionAt(startOffset), document.positionAt(endOffset));
        diagnostics.push(new Diagnostic(nRange, message));
      }
    }
  };

  matchFragments(CSS_REG, '', '');
  matchFragments(STYLE_REG, ':host { ', ' }');

  diagnosticCollection.set(document.uri, diagnostics);
});

export function markDiagnostic(context: ExtensionContext) {
  context.subscriptions.push(diagnosticCollection);

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateDiagnostic(editor.document);
      }
    }),
  );

  context.subscriptions.push(
    workspace.onDidChangeTextDocument(({ document }) => {
      updateDiagnostic(document);
    }),
  );

  if (window.activeTextEditor) {
    updateDiagnostic(window.activeTextEditor.document);
  }
}
