// ts-plugin 不支持
// Zed: https://github.com/zed-industries/zed/issues/4678

//@ts-ignore
import cssColors from 'css-color-keywords';
import type { HexColor } from 'duoyun-ui/lib/color';
import { parseHexColor, rgbToHexColor } from 'duoyun-ui/lib/color';
import type { ColorInformation, DocumentColorProvider, TextDocument } from 'vscode';
import { Color, Range } from 'vscode';

const COLOR_REG = new RegExp(
  `(?<start>'|")?(?<content>(#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})|${Object.keys(cssColors).join('|')}))($1|\\s*;|\\s*\\))`,
  'g',
);

export class ColorProvider implements DocumentColorProvider {
  provideDocumentColors(document: TextDocument) {
    COLOR_REG.exec('null');

    const documentText = document.getText();
    const colors: ColorInformation[] = [];

    let match: RegExpExecArray | null;
    while ((match = COLOR_REG.exec(documentText)) !== null) {
      const hex = (cssColors[match.groups!.content] || match.groups!.content) as HexColor;
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
