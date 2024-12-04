/* eslint-disable no-console */

const nativeDefineElement = window.customElements.define.bind(window.customElements);

window.customElements.define = (...rest: Parameters<typeof customElements.define>) => {
  const [name, con] = rest;
  if (!customElements.get(name)) {
    nativeDefineElement(...rest);
  } else {
    // update
    console.log(name, con);
  }
};
