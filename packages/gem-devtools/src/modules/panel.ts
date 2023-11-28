import { adoptedStyle, connectStore, createCSSSheet, css, customElement, GemElement, html } from '@mantou/gem';

import { panelStore } from '../store';

import '../elements/section';
import '../elements/statistics';

const TIP = 'Only works on GemElement written with Decorator, fallback to "Unobserved Properties"';

const style = createCSSSheet(css`
  :host {
    display: block;
    margin-bottom: 4em;
    font-size: 12px;
  }
  .not-gem {
    font-style: italic;
    padding: 0.5em;
    opacity: 0.5;
  }
`);

@customElement('devtools-panel')
@connectStore(panelStore)
@adoptedStyle(style)
export class Panel extends GemElement {
  render() {
    if (!panelStore.isGemElement) {
      return html`
        <div class="not-gem">This not's GemElement, current page stat:</div>
        <devtools-statistics name="Total Elements" ignore .value=${panelStore.elements}></devtools-statistics>
        <devtools-statistics name="Total Custom Elements" .value=${panelStore.customElements}></devtools-statistics>
        <devtools-statistics name="Total Gem Elements" .value=${panelStore.gemElements}></devtools-statistics>
        <devtools-statistics
          name="Defined Custom Elements"
          type="con"
          .value=${panelStore.definedCustomElements}
          .highlight=${panelStore.usedDefinedCustomElements}
        ></devtools-statistics>
        <devtools-statistics
          name="Defined Gem Elements"
          type="con"
          .value=${panelStore.definedGemElements}
          .highlight=${panelStore.usedDefinedGemElements}
        ></devtools-statistics>
        <devtools-statistics
          name="Used Defined Custom Elements"
          type="con"
          .value=${panelStore.usedDefinedCustomElements}
        ></devtools-statistics>
        <devtools-statistics
          name="Used Defined Gem Elements"
          type="con"
          .value=${panelStore.usedDefinedGemElements}
        ></devtools-statistics>
      `;
    }
    return html`
      <devtools-section name="Observed Attributes" .data=${panelStore.observedAttributes}></devtools-section>
      <devtools-section name="Observed Properties" .data=${panelStore.observedProperties}></devtools-section>
      <devtools-section name="Observed Stores" .data=${panelStore.observedStores}></devtools-section>
      <devtools-section name="Adopted Styles" .data=${panelStore.adoptedStyles}></devtools-section>
      <devtools-section
        name="State"
        .path=${panelStore.state.length ? ['state'] : undefined}
        .data=${panelStore.state}
      ></devtools-section>
      <devtools-section name="Emitters" .data=${panelStore.emitters}></devtools-section>
      <devtools-section name="Slots" tip=${TIP} .data=${panelStore.slots}></devtools-section>
      <devtools-section name="CSS States" tip=${TIP} .data=${panelStore.cssStates}></devtools-section>
      <devtools-section name="CSS Parts" tip=${TIP} .data=${panelStore.parts}></devtools-section>
      <devtools-section name="Refs" tip=${TIP} .data=${panelStore.refs}></devtools-section>
      <devtools-section name="Lifecycle Method" .data=${panelStore.lifecycleMethod}></devtools-section>
      <devtools-section name="Method" .data=${panelStore.method}></devtools-section>
      <devtools-section name="Unobserved Attributes" .data=${panelStore.attributes}></devtools-section>
      <devtools-section name="Unobserved Properties" .data=${panelStore.properties}></devtools-section>
      <devtools-section name="Class Static Member" .data=${panelStore.staticMember}></devtools-section>
    `;
  }
}
