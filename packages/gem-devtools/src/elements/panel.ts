import { connectStore, customElement, GemElement, html } from '@mantou/gem';

import { panelStore } from '../store';

import './section';

const TIP = 'Only works on GemElement written with TypeScript decorator, fallback to "Unobserved Propertys"';

@customElement('devtools-panel')
@connectStore(panelStore)
export class Panel extends GemElement {
  render() {
    if (!panelStore.isGemElement) {
      return html`
        <style>
          :host {
            display: block;
            text-align: center;
            font-style: italic;
            padding: 0.5em;
            opacity: 0.5;
          }
        </style>
        Not is GemElement
      `;
    }
    return html`
      <style>
        :host {
          display: block;
          margin-bottom: 4em;
          font-size: 12px;
        }
      </style>
      <devtools-section name="Observed Attributes" .data=${panelStore.observedAttributes}></devtools-section>
      <devtools-section name="Observed Propertys" .data=${panelStore.observedPropertys}></devtools-section>
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
      <devtools-section name="Unobserved Propertys" .data=${panelStore.propertys}></devtools-section>
      <devtools-section name="Class Static Member" .data=${panelStore.staticMember}></devtools-section>
    `;
  }
}
