import { createStore } from '@mantou/gem';

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
  constructor(options?: Partial<PanelStore>) {
    Object.assign(this, options);
  }
  isGemElement = true;
  gemVersion = '';
  elements = [] as string[];
  customElements = [] as string[];
  gemElements = [] as string[];
  definedCustomElements = [] as string[];
  definedGemElements = [] as string[];
  usedDefinedCustomElements = [] as string[];
  usedDefinedGemElements = [] as string[];
  observedAttributes = [] as Item[];
  observedProperties = [] as Item[];
  observedStores = [] as Item[];
  adoptedStyles = [] as Item[];
  state = [] as Item[];
  stateList = [] as Item[][];
  emitters = [] as Item[];
  slots = [] as Item[];
  cssStates = [] as Item[];
  parts = [] as Item[];
  refs = [] as Item[];
  lifecycleMethod = [] as Item[];
  method = [] as Item[];
  properties = [] as Item[];
  attributes = [] as Item[];
  staticMember = [] as Item[];
}

export const panelStore = createStore({ ...new PanelStore(), isGemElement: false });

export class ConfigureStore {
  currentFrameURL = '';
  frames: string[] = [];
}

export const configureStore = createStore(new ConfigureStore());
