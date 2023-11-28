import { createStore, updateStore } from '@mantou/gem';

const types = typeof ('' as any);
type Type = typeof types | 'element' | 'null';

// 0: 不是，1: 是，2: 可能是
export type BuildIn = 0 | 1 | 2;
export type Path = (string | string[])[];
export interface Item {
  value: string | number | boolean;
  name: string;
  type: Type;
  path?: Path;
  buildIn?: BuildIn;
}

export class PanelStore {
  isGemElement = true;
  elements = new Array<string>();
  customElements = new Array<string>();
  gemElements = new Array<string>();
  definedCustomElements = new Array<string>();
  definedGemElements = new Array<string>();
  usedDefinedCustomElements = new Array<string>();
  usedDefinedGemElements = new Array<string>();
  observedAttributes = new Array<Item>();
  observedProperties = new Array<Item>();
  observedStores = new Array<Item>();
  adoptedStyles = new Array<Item>();
  state = new Array<Item>();
  emitters = new Array<Item>();
  slots = new Array<Item>();
  cssStates = new Array<Item>();
  parts = new Array<Item>();
  refs = new Array<Item>();
  lifecycleMethod = new Array<Item>();
  method = new Array<Item>();
  properties = new Array<Item>();
  attributes = new Array<Item>();
  staticMember = new Array<Item>();
}

export const panelStore = createStore({ ...new PanelStore(), isGemElement: false });

export function changeStore(newPanelData: PanelStore) {
  updateStore(panelStore, newPanelData);
}
