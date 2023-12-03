export function getAllFrames() {
  const result: string[] = [];

  window.__GEM_DEVTOOLS__PRELOAD__.traverseDom((element) => {
    if (element instanceof HTMLIFrameElement) {
      const frameURL = element.src;
      if (frameURL) result.push(frameURL);
    }
  });

  return result;
}
