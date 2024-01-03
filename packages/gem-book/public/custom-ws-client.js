/**
 * @class
 * @implements {import('webpack-dev-server/client/clients/WebSocketClient')}
 * */
export default class WebSocketClient {
  /**
   * @param {string} url
   */
  constructor(url) {
    this.client = new WebSocket(url);
    this.client.onerror = (error) => {
      console.error(error);
    };
  }

  /**
   * @param {(...args: any[]) => void} f
   */
  onOpen(f) {
    this.client.onopen = f;
  }

  /**
   * @param {(...args: any[]) => void} f
   */
  onClose(f) {
    this.client.onclose = f;
  }

  // call f with the message string as the first argument
  /**
   * @param {(...args: any[]) => void} f
   */
  onMessage(f) {
    this.client.onmessage = (e) => {
      f(e.data);
      document.querySelector('gem-book')?.dispatchEvent(
        new CustomEvent('message', {
          detail: e.data,
        }),
      );
    };
  }
}
