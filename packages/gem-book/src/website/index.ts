import { css, history } from '@mantou/gem';

import { DEFAULT_FILE, DEV_THEME_FILE } from '../common/constant';
import { GemBookElement } from '../element';
import { theme as defaultTheme } from '../element/helper/theme';

if (process.env.GA_ID) {
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.GA_ID}`;
  script.onload = () => {
    function gtag(..._rest: any): any {
      // eslint-disable-next-line prefer-rest-params
      (window as any).dataLayer.push(arguments);
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
    gtag('config', process.env.GA_ID, { send_page_view: false });
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

const pluginSet = new Set(JSON.parse(String(process.env.PLUGINS)) as string[]);

pluginSet.forEach(loadPlugin);

addEventListener('plugin', ({ detail }: CustomEvent) => {
  if (pluginSet.has(detail)) return;
  // eslint-disable-next-line no-console
  console.info('GemBook auto load plugin:', detail);
  loadPlugin(detail);
});

const config = JSON.parse(String(process.env.BOOK_CONFIG));
const theme = JSON.parse(String(process.env.THEME));

const devRender = () => {
  const book = document.querySelector<GemBookElement>('gem-book') || new GemBookElement();
  book.src = `/${DEFAULT_FILE}`;
  book.dev = true;
  if (theme) {
    fetch(`/${DEV_THEME_FILE}`)
      .then((res) => res.json())
      .then((e) => {
        book.theme = e;
      });
  }
  document.body.append(book);
};

const buildRender = () => {
  const book = document.querySelector<GemBookElement>('gem-book') || new GemBookElement();
  book.config = config;
  book.theme = theme;
  document.body.append(book);
};

process.env.DEV_MODE ? devRender() : buildRender();

const style = document.createElement('style');
style.innerText = css`
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
    -webkit-overflow-scrolling: touch;
  }
`;
document.head.append(style);

if (!process.env.DEV_MODE) {
  window.addEventListener('load', () => {
    navigator.serviceWorker?.register('/service-worker.js');
  });
}
