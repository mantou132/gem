import { adoptedStyle, connectStore, css, customElement, GemElement, html, shadow } from '@mantou/gem';

import { panelStore } from '../store';

import '../elements/section';
import '../elements/statistics';
import '../elements/header';

const TIP = 'Only works on GemElement written with Decorator, fallback to "Unobserved Properties"';

const style = css`
  :host {
    display: block;
    margin-bottom: 4em;
    font-size: 12px;
  }
`;

@customElement('devtools-panel')
@connectStore(panelStore)
@adoptedStyle(style)
@shadow()
export class Panel extends GemElement {
  render() {
    return html`
      <devtools-header>
        ${panelStore.isGemElement ? panelStore.gemVersion : `This not's GemElement, page stat:`}
      </devtools-header>
      ${
        panelStore.isGemElement
          ? html`
            <devtools-section name="Observed Attributes" .items=${panelStore.observedAttributes}></devtools-section>
            <devtools-section name="Observed Properties" .items=${panelStore.observedProperties}></devtools-section>
            <devtools-section name="Observed Stores" .items=${panelStore.observedStores}></devtools-section>
            <devtools-section name="Adopted Styles" .items=${panelStore.adoptedStyles}></devtools-section>
            ${
              panelStore.state.length
                ? html`<devtools-section name="State" .path=${['state']} .items=${panelStore.state}></devtools-section>`
                : ''
            }
            ${panelStore.stateList.map(
              (state, index) => html`
                <devtools-section
                  name=${`State #${index}`}
                  .path=${['internals', 'stateList', `${index}`]}
                  .items=${state}
                ></devtools-section>
              `,
            )}
            <devtools-section name="Emitters" .items=${panelStore.emitters}></devtools-section>
            <devtools-section name="Slots" tip=${TIP} .items=${panelStore.slots}></devtools-section>
            <devtools-section name="CSS States" tip=${TIP} .items=${panelStore.cssStates}></devtools-section>
            <devtools-section name="CSS Parts" tip=${TIP} .items=${panelStore.parts}></devtools-section>
            ${
              panelStore.refs.length
                ? html`<devtools-section name="Refs" tip=${TIP} .items=${panelStore.refs}></devtools-section>`
                : ''
            }
            <devtools-section name="Lifecycle Method" .items=${panelStore.lifecycleMethod}></devtools-section>
            <devtools-section name="Method" .items=${panelStore.method}></devtools-section>
            <devtools-section name="Unobserved Attributes" .items=${panelStore.attributes}></devtools-section>
            <devtools-section name="Unobserved Properties" .items=${panelStore.properties}></devtools-section>
            <devtools-section name="Class Static Member" .items=${panelStore.staticMember}></devtools-section>
          `
          : html`
            <devtools-statistics name="Total Elements" ignore .data=${panelStore.elements}></devtools-statistics>
            <devtools-statistics name="Total Custom Elements" .data=${panelStore.customElements}></devtools-statistics>
            <devtools-statistics name="Total Gem Elements" .data=${panelStore.gemElements}></devtools-statistics>
            <devtools-statistics
              name="Defined Custom Elements"
              type="con"
              .data=${panelStore.definedCustomElements}
              .highlight=${panelStore.usedDefinedCustomElements}
            ></devtools-statistics>
            <devtools-statistics
              name="Defined Gem Elements"
              type="con"
              .data=${panelStore.definedGemElements}
              .highlight=${panelStore.usedDefinedGemElements}
            ></devtools-statistics>
            <devtools-statistics
              name="Used Defined Custom Elements"
              type="con"
              .data=${panelStore.usedDefinedCustomElements}
            ></devtools-statistics>
            <devtools-statistics
              name="Used Defined Gem Elements"
              type="con"
              .data=${panelStore.usedDefinedGemElements}
            ></devtools-statistics>
          `
      }
    `;
  }
}
