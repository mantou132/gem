import { createStore, updateStore } from '@mantou/gem';

const any: any = '';
const types = typeof any;
type Type = typeof types | 'element';

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
  observedAttributes: Item[] = [];
  observedPropertys: Item[] = [];
  observedStores: Item[] = [];
  adoptedStyles: Item[] = [];
  state: Item[] = [];
  emitters: Item[] = [];
  slots: Item[] = [];
  cssStates: Item[] = [];
  parts: Item[] = [];
  refs: Item[] = [];
  lifecycleMethod: Item[] = [];
  method: Item[] = [];
  propertys: Item[] = [];
  attributes: Item[] = [];
  staticMember: Item[] = [];
}

export const panelStore = createStore({ ...new PanelStore(), isGemElement: false });

export function changeStore(panel: Partial<PanelStore> | null) {
  if (panel === null) {
    updateStore(panelStore, { isGemElement: false });
  } else {
    updateStore(panelStore, {
      ...new PanelStore(),
      ...panel,
    });
  }
}
