// @ts-nocheck
import { customElement, GemElement } from '@mantou/gem';
import { lazy } from '@mantou/gemkit';

const TAG = 'app-counter';

@customElement(TAG)
@lazy()
export class AppCounterElement extends GemElement {}
