// @ts-ignore
// biome-ignore assist/source/organizeImports: export/path
import cssColors from 'css-color-keywords';
import type { HexColor } from 'duoyun-ui/lib/color';
import { parseHexColor, rgbToHexColor } from 'duoyun-ui/lib/color';
import { isNotNullish } from 'duoyun-ui/lib/types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { ColorInformation, ColorPresentation, SymbolInformation } from 'vscode-languageserver/node';
import { Color, Range } from 'vscode-languageserver/node';
import { cssLanguageService, documents, htmlLanguageService } from './global';

export class Provider {
  provideDocumentColors(document: TextDocument): ColorInformation[] {
    return [
      // NOTE: ignore `<style>`
      ...[...documents.getAllCSS(document), ...documents.getAllCSSFragment(document)].flatMap(
        ({ doc, startIndex, cssDoc }) => {
          const colors = cssLanguageService.findDocumentColors(doc, cssDoc);
          return colors.map((e) => ({
            ...e,
            range: {
              start: document.positionAt(startIndex + doc.offsetAt(e.range.start)),
              end: document.positionAt(startIndex + doc.offsetAt(e.range.end)),
            },
          }));
        },
      ),
      ...documents
        .getAllStyleValue(document)
        .map(({ text, startIndex }) => {
          const hex = (cssColors[text] || text) as HexColor;
          if (!hex.startsWith('#')) return;
          const [red, green, blue, alpha] = parseHexColor(hex);
          const range = Range.create(document.positionAt(startIndex), document.positionAt(startIndex + hex.length));
          const color = Color.create(red / 255, green / 255, blue / 255, alpha);
          return { range, color };
        })
        .filter(isNotNullish),
    ];
  }

  provideColorPresentations({ red, green, blue, alpha }: Color): ColorPresentation[] {
    return [{ label: rgbToHexColor([red * 255, green * 255, blue * 255, alpha]) }];
  }

  provideDocumentSymbols(document: TextDocument): SymbolInformation[] {
    return [
      ...documents.getAllCSS(document).map((e) => {
        const symbols = cssLanguageService.findDocumentSymbols(e.doc, e.cssDoc);
        return { ...e, symbols };
      }),
      ...documents.getAllHTML(document).map((e) => {
        const symbols = htmlLanguageService.findDocumentSymbols(e.doc, e.htmlDoc);
        return { ...e, symbols };
      }),
    ].flatMap(({ startIndex, symbols, doc }) =>
      symbols.map((symbol) => ({
        ...symbol,
        location: {
          uri: document.uri,
          range: {
            start: document.positionAt(startIndex + doc.offsetAt(symbol.location.range.start)),
            end: document.positionAt(startIndex + doc.offsetAt(symbol.location.range.end)),
          },
        },
      })),
    );
  }
}
