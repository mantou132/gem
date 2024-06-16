declare let $0: any;

export function observeSelectedElement() {
  const { __GEM_DEVTOOLS__STORE__ } = window;
  if (!__GEM_DEVTOOLS__STORE__ || !$0) return;

  const observer = (__GEM_DEVTOOLS__STORE__.domAttrMutation ||= new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      if (mutation.type === 'attributes') {
        const ele = mutation.target as Element;
        const attr = ele.getAttribute(mutation.attributeName!);
        if (attr === null) {
          ele.removeAttribute(mutation.attributeName!);
        } else if (attr !== mutation.oldValue) {
          ele.setAttribute(mutation.attributeName!, attr);
        }
      }
    }
  }));
  observer.disconnect();
  observer.observe($0, { attributeOldValue: true });
}
