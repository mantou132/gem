import { customElement } from '@mantou/gem/lib/decorators';
import { TapCollapseElement, TapCollapsePanelElement } from 'tap-ui/elements/collapse';

@customElement('dy-collapse-panel')
export class DuoyunCollapsePanelElement extends TapCollapsePanelElement {}

@customElement('dy-collapse')
export class DuoyunCollapseElement extends TapCollapseElement {}
