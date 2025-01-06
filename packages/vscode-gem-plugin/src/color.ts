// ts-plugin 不支持
// Zed: https://github.com/zed-industries/zed/issues/4678

// eslint-disable-next-line import/no-unresolved
import { Range, Color } from 'vscode';
import type { DocumentColorProvider, ColorInformation, TextDocument } from 'vscode';
import { rgbToHexColor, parseHexColor } from 'duoyun-ui/lib/color';
import type { HexColor } from 'duoyun-ui/lib/color';

const COLOR_REG = /(?<start>'|")?(?<content>#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4}))($1|\s*;|\s*\))/g;

export class ColorProvider implements DocumentColorProvider {
  provideDocumentColors(document: TextDocument) {
    COLOR_REG.exec('null');

    const documentText = document.getText();
    const colors: ColorInformation[] = [];

    let match: RegExpExecArray | null;
    while ((match = COLOR_REG.exec(documentText)) !== null) {
      const hex = match.groups!.content as HexColor;
      const [red, green, blue, alpha] = parseHexColor(hex);
      const offset = match.index + (match.groups!.start?.length || 0);
      const range = new Range(document.positionAt(offset), document.positionAt(offset + hex.length));
      const color = new Color(red / 255, green / 255, blue / 255, alpha);
      colors.push({ range, color });
    }
    return colors;
  }

  provideColorPresentations({ red, green, blue, alpha }: Color) {
    return [{ label: rgbToHexColor([red * 255, green * 255, blue * 255, alpha]) }];
  }
}
