import { GemElement, async, connectStore, customElement, html, property, render, shadow, useStore } from '@mantou/gem';

import '../elements/layout';

const [store, update] = useStore({
  number: 1,
});

setInterval(() => {
  update({ number: (store.number % 10) + 1 });
}, 1000);

@customElement('fiber-dot')
@connectStore(store)
@async()
@shadow()
export class Dot extends GemElement {
  constructor() {
    super();
    this.addEventListener('mouseenter', this.onMouseenter);
    this.addEventListener('mouseleave', this.onMouseleave);
  }

  onMouseenter = () => {
    this.setState({ hover: true });
  };
  onMouseleave = () => {
    this.setState({ hover: false });
  };

  size: number;
  x: number;
  y: number;

  state = { hover: false };

  render() {
    const s = this.size * 1.3;
    Object.assign(this.style, {
      width: s + 'px',
      height: s + 'px',
      left: this.x + 'px',
      top: this.y + 'px',
      borderRadius: s / 2 + 'px',
      lineHeight: s + 'px',
      background: this.state.hover ? '#ff0' : '#61dafb',
    });
    return html`
      <style>
        :host {
          position: absolute;
          font: normal 15px sans-serif;
          text-align: center;
          cursor: pointer;
          display: block;
        }
      </style>
      ${this.state.hover ? '**' + store.number + '**' : store.number}
    `;
  }
}

const targetSize = 25;

@customElement('fiber-triangle')
@shadow()
export class Triangle extends GemElement {
  x: number;
  y: number;
  s: number;
  seconds: number;

  render() {
    let s = this.s;
    if (s <= targetSize) {
      return html`
        <fiber-dot .x=${this.x - targetSize / 2} .y=${this.y - targetSize / 2} .size=${targetSize}></fiber-dot>
      `;
    }
    s = s / 2;

    const slowDown = true;
    if (slowDown) {
      const e = performance.now() + 0.8;
      while (performance.now() < e) {
        // Artificially long execution time.
      }
    }
    return html`
      <fiber-triangle .x=${this.x} .y=${this.y - s / 2} .s=${s}></fiber-triangle>
      <fiber-triangle .x=${this.x - s} .y=${this.y + s / 2} .s=${s}></fiber-triangle>
      <fiber-triangle .x=${this.x + s} .y=${this.y + s / 2} .s=${s}></fiber-triangle>
    `;
  }
}

@customElement('app-root')
@shadow()
class App extends GemElement {
  @property elapsed: number;
  render() {
    const elapsed = this.elapsed;
    const t = (elapsed / 1000) % 10;
    const scale = 1 + (t > 5 ? 10 - t : t) / 10;
    this.style.transform = 'scaleX(' + scale / 2.1 + ') scaleY(0.7) translateZ(0.1px)';
    return html`
      <style>
        :host {
          position: absolute;
          transform-origin: 0 0;
          left: 50%;
          top: 50%;
          width: 10px;
          height: 10px;
          background: #eee;
        }
      </style>
      <div>
        <fiber-triangle .x=${0} .y=${0} .s=${1000}></fiber-triangle>
      </div>
    `;
  }
}

const app = new App();
render(
  html`
    <gem-examples-layout>
      <div>
        <ul>
          <li><a href="https://stencil-fiber-demo.firebaseapp.com/perf.html">stencil-fiber-demo</a></li>
          <li><a href="https://claudiopro.github.io/react-fiber-vs-stack-demo/fiber.html">react-fiber-demo</a></li>
        </ul>
        ${app}
      </div>
    </gem-examples-layout>
  `,
  document.body,
);

const start = Date.now();
function tick() {
  app.elapsed = Date.now() - start;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
