import { customElement } from '@mantou/gem/lib/decorators';
import { TapSegmentedElement } from 'tap-ui/elements/segmented';

export type { SegmentedOption } from 'tap-ui/elements/segmented';

@customElement('dy-segmented')
export class DuoyunSegmentedElement extends TapSegmentedElement {}
