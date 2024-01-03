export class Logger {
  _type: string;

  constructor(type: string) {
    this._type = type;
  }

  info = (...args: any[]) => {
    console.log(`[${this._type}]:`, ...args);
  };

  warn = (...args: any[]) => {
    console.warn(`[${this._type}]:`, ...args);
  };

  error = (...args: any[]) => {
    console.error(`[${this._type}]:`, ...args);
  };
}

export const logger = new Logger('GEM');
