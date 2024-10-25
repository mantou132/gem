// eslint-disable-next-line import/no-unresolved
import { workspace, Range, Position } from 'vscode';
import { TextDocument as HTMLTextDocument, TokenType as HTMLTokenType } from 'vscode-html-languageservice';
import type { TextLine, CompletionItem } from 'vscode';
import type { LanguageService, CompletionList as HtmlCompletionList } from 'vscode-html-languageservice';
import type { VSCodeEmmetConfig } from '@vscode/emmet-helper';

export function translateToCSS(text: string) {
  return text.replace(/\$\{.*\}/g, (str) => 'x'.repeat(str.length));
}

export function translateCompletionList(list: HtmlCompletionList, line: TextLine, expand?: boolean) {
  return {
    ...list,
    items: list.items.map((item) => {
      const result = item as CompletionItem;

      if (result.textEdit) {
        const range = new Range(
          new Position(line.lineNumber, result.textEdit.range.start.character),
          new Position(line.lineNumber, result.textEdit.range.end.character),
        );
        result.textEdit = undefined;
        // setting range for intellisense to show results properly
        result.range = range;
      }

      if (expand) {
        // i use this to both expand html abbreviations and auto complete tags
        result.command = {
          title: 'Emmet Expand Abbreviation',
          command: 'editor.emmet.action.expandAbbreviation',
        };
      }

      return result;
    }),
  };
}

export function getEmmetConfiguration() {
  const emmetConfig = workspace.getConfiguration('emmet');
  return {
    useNewEmmet: true,
    showExpandedAbbreviation: emmetConfig.showExpandedAbbreviation,
    showAbbreviationSuggestions: emmetConfig.showAbbreviationSuggestions,
    syntaxProfiles: emmetConfig.syntaxProfiles,
    variables: emmetConfig.variables,
  } as VSCodeEmmetConfig;
}

export function notNull<T>(input: any) {
  if (!input) {
    return {} as T;
  }
  return input as T;
}

export function matchOffset(regex: RegExp, data: string, offset: number) {
  regex.exec('null');

  let match: RegExpExecArray | null;
  while ((match = regex.exec(data)) !== null) {
    if (offset > match.index + match[1].length && offset < match.index + match[0].length) {
      return match;
    }
  }
  return null;
}

export function getLanguageRegions(service: LanguageService, data: string) {
  const scanner = service.createScanner(data);
  const regions: IEmbeddedRegion[] = [];
  let tokenType: HTMLTokenType;

  while ((tokenType = scanner.scan()) !== HTMLTokenType.EOS) {
    switch (tokenType) {
      case HTMLTokenType.Styles:
        regions.push({
          languageId: 'css',
          start: scanner.getTokenOffset(),
          end: scanner.getTokenEnd(),
          length: scanner.getTokenLength(),
          content: scanner.getTokenText(),
        });
        break;
      default:
        break;
    }
  }

  return regions;
}

export function getRegionAtOffset(regions: IEmbeddedRegion[], offset: number) {
  for (const region of regions) {
    if (region.start <= offset) {
      if (offset <= region.end) {
        return region;
      }
    } else {
      break;
    }
  }
  return null;
}

export function createVirtualDocument(
  // context: TextDocument | HTMLTextDocument,
  languageId: string,
  // position: Position | HtmlPosition,
  content: string,
) {
  return HTMLTextDocument.create(`embedded://document.${languageId}`, languageId, 1, content);
}

export interface IEmbeddedRegion {
  languageId: string;
  start: number;
  end: number;
  length: number;
  content: string;
}
