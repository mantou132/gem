// 只对 CSS 语法和属性做了简单的检查，不做值检查
// TODO: 激活扩展、打开工作区时需要自动诊断所有文件
// TODO: 使用 LRU 缓存

import { getCSSLanguageService } from 'vscode-css-languageservice';
import { Range } from 'vscode-languageserver/node';
import type { Diagnostic } from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { CSS_REG, STYLE_REG } from './constants';
import { createVirtualDocument, removeSlot } from './util';

const cssLanguageService = getCSSLanguageService();

export function getDiagnostics(document: TextDocument, _relatedInformation: boolean) {
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
        diagnostics.push({
          range: Range.create(document.positionAt(startOffset), document.positionAt(endOffset)),
          message,
        });
      }
    }
  };

  matchFragments(CSS_REG, '', '');
  matchFragments(STYLE_REG, ':host { ', ' }');

  return diagnostics;
}
