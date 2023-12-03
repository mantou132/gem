export function getAllFrames() {
  const result = [];

  // 同 dom-stat 迭代
  const temp: Element[] = [document.documentElement];
  while (!!temp.length) {
    const element = temp.pop()!;

    if (element instanceof HTMLIFrameElement) {
      const frameURL = element.src;
      if (frameURL) result.push(frameURL);
    }

    if (element.shadowRoot?.firstElementChild) temp.push(element.shadowRoot.firstElementChild);
    if (element.firstElementChild) temp.push(element.firstElementChild);
    if (element.nextElementSibling) temp.push(element.nextElementSibling);
  }

  return result;
}
