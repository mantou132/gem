// 由于只复制函数体，所以不能引用外部变量
/**
 * 打开 DevTools 时安装：在 Performance 面板中添加 Gem 轨道，记录每个元素渲染模版的耗时，
 * 没有安装扩展或者没有打开 DevTools 时不记录
 */
export const installPerformanceTrack = () => {
  const install = () => {
    const { __GEM_DEVTOOLS__HOOK__: hook, __GEM_DEVTOOLS__STORE__: store } = window;
    if (!hook?.setEngine || !store) return false;
    if (store.performanceTrack) return true;
    const { setEngine, html, render } = hook;
    const measuredRender: typeof render = (value, container, options) => {
      const start = performance.now();
      const result = render(value, container, options);
      const host = container instanceof ShadowRoot ? container.host : container;
      performance.measure((host as Element).localName || '#fragment', {
        start,
        detail: { devtools: { dataType: 'track-entry', track: 'Gem', color: 'primary' } },
      });
      return result;
    };
    setEngine(html, measuredRender);
    // 扫描从 `hook` 读取 `render` 来包装和还原，需要保留记录
    hook.render = measuredRender;
    store.performanceTrack = true;
    return true;
  };
  // 页面刚导航时 Gem 可能还没有加载
  if (!install()) window.addEventListener('load', install, { once: true });
};
