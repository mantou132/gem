export function getAllFrames() {
  const frames: string[] = [];

  window.__GEM_DEVTOOLS__PRELOAD__.traverseDom((element) => {
    if (element instanceof HTMLIFrameElement) {
      const frameURL = element.src;
      if (frameURL) frames.push(frameURL);
    }
  });

  return { frames };
}
