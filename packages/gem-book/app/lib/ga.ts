/** Google Analytics，客户端导航时手动发送页面访问 */
let gtag: ((...args: unknown[]) => void) | undefined;

export function trackPageView(id: string) {
  if (!gtag) {
    const dataLayer: unknown[] = ((window as any).dataLayer ||= []);
    // gtag 需要 `arguments` 对象
    gtag = function () {
      // biome-ignore lint/complexity/noArguments: gtag.js 的约定
      dataLayer.push(arguments);
    };
    gtag('js', new Date());
    gtag('config', id, { send_page_view: false });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.append(script);
  }
  gtag('event', 'page_view', {
    page_location: location.href,
    page_path: location.pathname,
    page_title: document.title,
  });
}
