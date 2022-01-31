import type { GemBookElement } from '../element';

type Value = {
  props?: Record<string, string>;
  innerHTML?: string;
};

type State = {
  loading: boolean;
  error?: any;
  value: Value;
};

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { html, customElement, attribute, property } = GemBookPluginElement.Gem;
  @customElement('gbp-example')
  class _GbpExampleElement extends GemBookPluginElement {
    @attribute name: string;
    @attribute src: string;

    @property initValue?: Value;

    constructor() {
      super({ isLight: true });
    }

    state: State = {
      loading: true,
      value: {},
    };

    #renderElement = () => {
      const { value } = this.state;
      const Cls = customElements.get(this.name);
      if (!Cls) return html``;
      const ele = new Cls();
      if (value.innerHTML) ele.innerHTML = value.innerHTML;
      if (value.props) {
        Object.entries(value.props).forEach(([key, value]) => {
          if (key.startsWith('@')) {
            ele.addEventListener(key.slice(1), eval(value));
          } else if (key.startsWith('?')) {
            (ele as any)[key.slice(1)] = true;
          } else if (key.startsWith('.')) {
            (ele as any)[key.slice(1)] = JSON.parse(value);
          } else {
            (ele as any)[key.slice(1)] = value;
          }
        });
      }
      return ele;
    };

    #renderToken = (token: string) => {
      return html`<span class="token">${token}</span>`;
    };

    #renderPropValue = ([key, value]: [string, string]) => {
      return html`<br /><span> </span><span> </span><span class="attribute">${key}</span>${this.#renderToken(
          '=',
        )}${html`\${${this.#renderToken(value)}}`}`;
    };

    #renderProps = () => {
      const { props } = this.state.value;
      return html`${Object.entries(props || {}).map(this.#renderPropValue)}`;
    };

    #renderTag = (tag: string, close?: boolean) => {
      const openToken = '<' + (close ? '/' : '');
      const closeToken = '>';
      return html`${close ? html`<br />` : ''}${this.#renderToken(openToken)}<span class="tag"
          >${tag}${close ? '' : this.#renderProps()}</span
        >${this.#renderToken(closeToken)}`;
    };

    #renderCode = () => {
      const { value } = this.state;
      return html`${this.#renderTag(this.name)}${value.innerHTML}${this.#renderTag(this.name, true)}`;
    };

    mounted = async () => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = this.src;
      script.crossOrigin = 'anonymous';
      script.onload = () => this.setState({ value: this.initValue, loading: false });
      script.onerror = (evt: ErrorEvent) => this.setState({ error: evt.error });
      document.body.append(script);
    };

    render = () => {
      const { error, loading } = this.state;
      if (error) return html`${error}`;
      if (loading) return html`<div class="loading">Example loading...</div>`;
      return html`
        <div class="preview">${this.#renderElement()}</div>
        <div class="panel">
          <div class="code">${this.#renderCode()}</div>
        </div>
      `;
    };
  }
});
