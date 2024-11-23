import { rgbToHexColor, parseHexColor } from 'duoyun-ui/lib/color';
import { Range, Color } from 'vscode-languageserver/node';
import type { ColorInformation, ColorPresentation } from 'vscode-languageserver/node';
import type { HexColor } from 'duoyun-ui/lib/color';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { COLOR_REG } from './constants';

export class ColorProvider {
  provideDocumentColors(document: TextDocument) {
    COLOR_REG.exec('null');

    const documentText = document.getText();
    const colors: ColorInformation[] = [];

    let match: RegExpExecArray | null;
    while ((match = COLOR_REG.exec(documentText)) !== null) {
      const hex = match.groups!.content as HexColor;
      const [red, green, blue, alpha] = parseHexColor(hex);
      const offset = match.index + (match.groups!.start?.length || 0);
      const range = Range.create(document.positionAt(offset), document.positionAt(offset + hex.length));
      const color = Color.create(red / 255, green / 255, blue / 255, alpha);
      colors.push({ range, color });
    }
    return colors;
  }

  provideColorPresentations({ red, green, blue, alpha }: Color): ColorPresentation[] {
    return [{ label: rgbToHexColor([red * 255, green * 255, blue * 255, alpha]) }];
  }
}
