export class MockPromise {
  static resolve() {
    return new MockPromise(() => {});
  }

  static reject() {
    return new MockPromise(() => {});
  }

  static all() {
    return new MockPromise(() => {});
  }

  static race() {
    return new MockPromise(() => {});
  }

  static allSettled() {
    return new MockPromise(() => {});
  }

  static any() {
    return new MockPromise(() => {});
  }

  constructor(executor: (resolve: (value: any) => void, reject: (reason?: any) => void) => void) {
    executor(
      () => {},
      () => {},
    );
  }

  // biome-ignore lint/suspicious/noThenProperty: mock
  then() {
    return new MockPromise(() => {});
  }

  catch() {
    return new MockPromise(() => {});
  }

  finally() {
    return new MockPromise(() => {});
  }
}
