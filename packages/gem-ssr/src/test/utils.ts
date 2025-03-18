import { snapshot } from 'node:test';

import type { TemplateResult } from '@mantou/gem/lib/lit-html';

import { renderToString } from '..';

snapshot.setDefaultSnapshotSerializers([(v) => v]);

export const t = async (result: TemplateResult) =>
  (await renderToString(result)).replaceAll(/lit\$\d+\$/g, '$lit-temp$');
