import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';
import { adoptedStyle, connectStore, customElement, emitter, Emitter, property } from '@mantou/gem/lib/decorators';

import { ComparerType, isIncludesString } from '../lib/utils';
import { Time } from '../lib/time';
import { locale } from '../lib/locale';
import { icons } from '../lib/icons';
import { blockContainer } from '../lib/styles';
import type { Option } from '../elements/select';

import '../elements/radio';
import '../elements/button';
import '../elements/date-panel';
import '../elements/select';
import '../elements/input';

export type FilterableType = 'string' | 'number' | 'time' | 'duration' | 'enum';

export type FilterableOptions = {
  type?: FilterableType;
  // enum
  getOptions?: (provider: string) => Option[] | undefined;
  getProviders?: () => Option[] | undefined;
};

const style = createCSSSheet(css`
  dy-input,
  dy-select {
    width: 100%;
  }
  dy-input-group.duration dy-select {
    width: 120px;
  }
  dy-input-group.filter dy-select {
    width: 50%;
  }
  dy-select {
    max-height: 13.2em;
  }
  .line {
    margin-block-end: 1em;
  }
  .filter {
    margin-block-end: 0.5em;
  }
`);

type State = {
  comparer: ComparerType;
  value: string | number | string[];
  /**duration */
  durationUnit: number;
  /**enum*/
  search: string;
  provider: string;
};

const durationUnitList = [
  { label: locale.minute, value: 1000 * 60 },
  { label: locale.hour, value: 1000 * 60 * 60 },
];

/**
 * @customElement dy-pat-filter-form
 */
@customElement('dy-pat-filter-form')
@adoptedStyle(style)
@adoptedStyle(blockContainer)
@connectStore(locale)
export class DyPatFilterFormElement extends GemElement<State> {
  @property options?: FilterableOptions;
  @property getText?: (text: ComparerType) => string;

  @emitter submit: Emitter<any>;

  get #type() {
    return this.options?.type || 'string';
  }

  get #durationValue() {
    return ((Number(this.state.value) || 0) / this.state.durationUnit).toString();
  }

  get #comparerList(): ComparerType[] {
    switch (this.#type) {
      case 'duration':
      case 'time':
      case 'number':
        return [ComparerType.Lte, ComparerType.Gte];
      case 'enum':
        return [ComparerType.Have, ComparerType.Miss];
      default:
        return [ComparerType.Have, ComparerType.Miss, ComparerType.Eq];
    }
  }

  get #disabled() {
    const { value } = this.state;
    switch (this.#type) {
      case 'enum':
        return !Array.isArray(value) || !value.length;
      case 'time':
      case 'duration':
      case 'number':
      default:
        return !value;
    }
  }

  state: State = {
    comparer: ComparerType.Eq,
    value: '',
    durationUnit: durationUnitList[0].value,
    search: '',
    provider: '',
  };

  #onSubmit = () => {
    if (this.#disabled) return;
    const { comparer, value } = this.state;
    this.submit({ comparer, value });
  };

  #onChangeValue = ({ detail }: CustomEvent<string>) => {
    this.setState({ value: detail });
  };

  #onChangeDataValue = ({ detail }: CustomEvent<number>) => {
    this.setState({
      value: String(this.state.comparer === ComparerType.Lte ? new Time(detail).endOf('d').valueOf() : detail),
    });
  };

  #onChangeDurationValue = ({ detail }: CustomEvent<string>) => {
    if (isNaN(Number(detail))) return;
    this.setState({
      value: (Number(detail) * this.state.durationUnit).toString(),
    });
  };

  #onChangeDurationUnit = ({ detail }: CustomEvent<number>) => {
    this.setState({
      value: String(((Number(this.state.value) || 0) / this.state.durationUnit) * detail),
      durationUnit: detail,
    });
  };

  #renderInput = () => {
    switch (this.#type) {
      case 'time':
        return html`
          <dy-date-panel
            @change=${this.#onChangeDataValue}
            .value=${this.state.value === '' ? undefined : Number(this.state.value)}
          ></dy-date-panel>
        `;
      case 'enum':
        const getProviders = this.options?.getProviders;
        const options: Option[] | undefined = this.options?.getOptions?.(this.state.provider);
        const filteredOptions = this.state.search
          ? options?.filter(({ label }) => isIncludesString(label, this.state.search))
          : options;
        const hasFilter = options && options.length > 30;
        return html`
          ${hasFilter
            ? html`
                <dy-input-group class="filter">
                  ${getProviders
                    ? html`
                        <dy-select
                          @change=${({ detail }: CustomEvent<string>) => this.setState({ provider: detail })}
                          .value=${this.state.provider}
                          .options=${getProviders()}
                        ></dy-select>
                      `
                    : ''}
                  <dy-input
                    .icon=${icons.search}
                    .placeholder=${locale.search}
                    autofocus
                    value=${this.state.search}
                    @change=${({ detail: search }: CustomEvent<string>) => this.setState({ search })}
                    clearable
                    @clear=${() => this.setState({ search: '' })}
                  ></dy-input>
                </dy-input-group>
              `
            : ''}
          ${filteredOptions?.length
            ? html`
                <dy-select
                  @change=${this.#onChangeValue}
                  .inline=${true}
                  .multiple=${true}
                  .value=${this.state.value}
                  .options=${filteredOptions}
                ></dy-select>
              `
            : html``}
        `;
      case 'duration':
        return html`
          <dy-input-group class="duration">
            <dy-input @change=${this.#onChangeDurationValue} .value=${this.#durationValue}></dy-input>
            <dy-select
              @change=${this.#onChangeDurationUnit}
              .value=${this.state.durationUnit}
              .options=${durationUnitList}
            ></dy-select>
          </dy-input-group>
        `;
      case 'number':
        return html`
          <dy-input
            type="number"
            autofocus
            @change=${this.#onChangeValue}
            .value=${String(this.state.value)}
          ></dy-input>
        `;
      default:
        return html`
          <dy-input autofocus @change=${this.#onChangeValue} .value=${String(this.state.value)}></dy-input>
        `;
    }
  };

  mounted = () => {
    this.effect(
      () => {
        this.setState({ comparer: this.#comparerList[0], value: '' });
      },
      () => [this.options],
    );
  };

  render = () => {
    const { comparer } = this.state;
    return html`
      ${this.#comparerList.map(
        (e) => html`
          <div class="line">
            <dy-radio ?checked=${e === comparer} @change=${() => this.setState({ comparer: e, value: '' })}>
              ${this.getText?.(e) || e}
            </dy-radio>
          </div>
          <div class="line">${e === comparer ? this.#renderInput() : ''}</div>
        `,
      )}
      <dy-button ?disabled=${this.#disabled} @click=${this.#onSubmit}>${locale.ok}</dy-button>
    `;
  };
}
