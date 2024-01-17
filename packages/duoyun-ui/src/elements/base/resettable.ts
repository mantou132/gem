import { cleanObject } from '@mantou/gem/lib/utils';
import { GemElement } from '@mantou/gem/lib/element';

export class DuoyunResettableBaseElement<T = Record<string, unknown>> extends GemElement<T> {
  constructor() {
    super();
    this.effect(
      () => (this.#initState = { ...this.state }),
      () => [],
    );
  }

  #initState: T;
  state: T;

  reset = () => {
    cleanObject(this.state!);
    this.setState({ ...this.#initState });
  };
}
