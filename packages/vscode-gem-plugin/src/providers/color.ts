// eslint-disable-next-line import/no-unresolved
import { ColorPresentation, ColorInformation, Range, Color } from 'vscode';
import { rgbToHexColor, parseHexColor } from 'duoyun-ui/lib/color';
import type { HexColor } from 'duoyun-ui/lib/color';
import type { DocumentColorProvider, TextDocument } from 'vscode';

import { COLOR_REG } from '../constants';

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
      colors.push(new ColorInformation(range, new Color(red / 255, green / 255, blue / 255, alpha)));
    }
    return colors;
  }

  provideColorPresentations({ red, green, blue, alpha }: Color) {
    return [new ColorPresentation(rgbToHexColor([red * 255, green * 255, blue * 255, alpha]))];
  }
}
