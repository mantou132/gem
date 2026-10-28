import { createStore } from '@mantou/gem';
import type { HydrationMismatch } from '@mantou/gem-ssr/client';

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

// 选中元素的 SSR 信息
export interface SSRStatus {
  render: string;
  lazy?: string;
  mismatches: Omit<HydrationMismatch, 'node'>[];
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
  stateList = [] as Item[][];
  emitters = [] as Item[];
  slots = [] as Item[];
  cssStates = [] as Item[];
  parts = [] as Item[];
  lifecycleMethod = [] as Item[];
  method = [] as Item[];
  properties = [] as Item[];
  attributes = [] as Item[];
  staticMember = [] as Item[];
  // 选中元素没有 SSR 信息时为 `null`
  ssrStatus = null as SSRStatus | null;
  // 页面是否使用了 gem-ssr
  ssr = false;
  mismatchElements = [] as string[];
  hydratedElements = [] as string[];
  serverElements = [] as string[];
  lazyElements = [] as string[];
}

export const panelStore = createStore({ ...new PanelStore(), isGemElement: false });

export class ConfigureStore {
  currentFrameURL = '';
  frames: string[] = [];
}

export const configureStore = createStore(new ConfigureStore());
