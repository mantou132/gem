declare function inspect(arg: any): void;

export type DomStatInfo = {
  type: 'ele' | 'con';
  id: string;
};

export function inspectDom({ id, type }: DomStatInfo) {
  const { __GEM_DEVTOOLS__STORE__, __GEM_DEVTOOLS__HOOK__ } = window;
  if (!__GEM_DEVTOOLS__STORE__ || !__GEM_DEVTOOLS__HOOK__) return;
  const { currentElementsMap, customElementMap } = __GEM_DEVTOOLS__STORE__;

  if (type === 'con') {
    const con = customElementMap.get(id);
    inspect(con);
    console.dir(con);
  } else {
    inspect(currentElementsMap.get(id));
  }
}
