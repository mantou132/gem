export class Logger {
  #type: string;

  get #prefix() {
    return `[${this.#type}]`;
  }

  constructor(type: string) {
    this.#type = type;
  }

  info = (...args: any[]) => {
    console.log(this.#prefix, ...args);
  };

  warn = (...args: any[]) => {
    console.warn(this.#prefix, ...args);
  };

  error = (...args: any[]) => {
    console.error(this.#prefix, ...args);
  };
}

export const logger = new Logger('GEM');
