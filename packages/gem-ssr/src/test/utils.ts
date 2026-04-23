import { snapshot } from 'node:test';

import type { TemplateResult } from '@mantou/gem/lib/lit-html';

import { renderToString } from '..';
import { LIT_PART_START_RE } from '../client/hydration';

snapshot.setDefaultSnapshotSerializers([(v) => v]);

export const t = async (result: TemplateResult) =>
  (await renderToString(result)).replaceAll(new RegExp(LIT_PART_START_RE, 'g'), '?lit$000$');
