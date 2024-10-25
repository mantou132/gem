import { aria, customElement, mounted, numattribute } from '@mantou/gem/lib/decorators';

import { theme } from '../lib/theme';

import { DuoyunMeterElement } from './meter';

@customElement('dy-progress')
@aria({ role: 'progressbar' })
export class DuoyunProgressElement extends DuoyunMeterElement {
  /**ms */
  @numattribute estimate: number;

  @mounted()
  #setNextValue = () => {
    setTimeout(() => {
      if (this.estimate) {
        this.value += (99 - this.value) * (300 / this.estimate);
        this.#setNextValue();
      }
    }, 100);
  };

  calculateColor = () => {
    return theme.informativeColor;
  };
}
