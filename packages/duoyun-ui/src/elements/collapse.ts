import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { css, type Metadata } from '@mantou/gem/lib/element';
import { TapCollapseElement, TapCollapsePanelElement } from '@mantou/tap-ui/elements/collapse';

import { theme } from '../lib/theme';

// 桌面端外观：带边框的面板，标题栏使用浅背景，箭头在左侧
const panelStyle = css`
  :host(:where(:not([hidden]))) {
    border-block-start: 1px solid ${theme.borderColor};
  }
  :host(:not(:last-of-type))::after {
    content: none;
  }
  .summary {
    gap: 0.5em;
    min-height: auto;
    padding: 1em;
    font-size: inherit;
    line-height: inherit;
    color: inherit;
    background: ${theme.lightBackgroundColor};
  }
  .icon {
    order: 0;
    width: 1.2em;
    color: inherit;
    opacity: 1;
  }
  .detail {
    color: inherit;
    border-block-start: 0px solid ${theme.borderColor};
  }
  .detail.expand {
    padding-block: 1em;
    border-width: 1px;
  }
`;

// dy-collapse 渲染的是 tap-collapse-panel，让其样式等于 dy-collapse-panel
(TapCollapsePanelElement[Symbol.metadata] as Metadata).adoptedStyleSheets?.push(panelStyle);

@customElement('dy-collapse-panel')
export class DuoyunCollapsePanelElement extends TapCollapsePanelElement {}

const style = css`
  :scope:where(:not([hidden])) {
    border-radius: ${theme.normalRound};
    border: 1px solid ${theme.borderColor};
    background: none;
  }
  :scope :state(collapse-panel):first-child {
    border-block-start: none;
  }
`;

@customElement('dy-collapse')
@adoptedStyle(style)
export class DuoyunCollapseElement extends TapCollapseElement {}
