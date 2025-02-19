import { history } from '@mantou/gem';
import { logger } from '@mantou/gem/helper/logger';

import { GemBookElement } from '../element';
import type { BookConfig } from '../common/config';
import { theme as defaultTheme } from '../element/helper/theme';

const gaId = process.env.GA_ID;
const dev = process.env.DEV_MODE as unknown as boolean;
const config = process.env.BOOK_CONFIG as unknown as BookConfig;
const theme = process.env.THEME as unknown as Record<string, string>;
const plugins = process.env.PLUGINS as unknown as string[];

if (gaId) {
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  script.onload = () => {
    function gtag(...args: any) {
      (window as any).dataLayer.push(args);
    }
    function send() {
      // https://gemjs.org/en/api/history
      const { path } = history.getParams();
      gtag('event', 'page_view', {
        page_location: location.origin + path,
        page_path: path,
        page_title: document.title,
      });
    }
    gtag('js', new Date());
    gtag('config', gaId, { send_page_view: false });
    send();
    // https://book.gemjs.org/en/api/event
    window.addEventListener('routechange', send);
  };
  document.body.append(script);
  script.remove();
}

function loadPlugin(plugin: string) {
  if (/^(https?:)?\/\//.test(plugin)) {
    const script = document.createElement('script');
    script.src = plugin;
    document.body.append();
    script.remove();
  } else {
    import(/* webpackInclude: /(?<!\.d)\.t|js$/ */ `../plugins/${plugin}`);
  }
}

plugins.forEach(loadPlugin);
addEventListener('plugin', ({ detail }: CustomEvent) => {
  if (plugins.includes(detail)) return;
  logger.info('GemBook auto load plugin:', detail);
  loadPlugin(detail);
});

const book = document.querySelector<GemBookElement>('gem-book') || new GemBookElement();
book.config = config;
book.theme = theme;
book.dev = dev;
document.body.append(book);

const style = document.createElement('style');
style.textContent = /*css*/ `
  ::selection,
  ::target-text {
    color: ${defaultTheme.backgroundColor};
    background: ${defaultTheme.primaryColor};
  }
  ::highlight(search) {
    color: ${defaultTheme.backgroundColor};
    background: ${defaultTheme.noteColor};
  }
  :where(:focus) {
    outline: none;
  }
  :where(:focus-visible) {
    outline: 2px solid ${defaultTheme.primaryColor};
    outline-offset: -2px;
  }
  :where(html) {
    height: 100%;
    overflow: hidden;
    font: 16px/1.7 ${defaultTheme.font};
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
  }
  :where(body) {
    margin: 0;
    height: 100%;
    overflow: auto;
    overscroll-behavior: none;
  }
  @media print {
    body {
      overflow: visible;
    }
  }
`;
document.head.append(style);

if (!dev) {
  window.addEventListener('load', () => {
    navigator.serviceWorker?.register('/service-worker.js');
  });
}
