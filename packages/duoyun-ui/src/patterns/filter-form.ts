import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';
import { adoptedStyle, connectStore, customElement, emitter, Emitter, property } from '@mantou/gem/lib/decorators';
import { Store, connect } from '@mantou/gem/lib/store';

import { ComparerType, isIncludesString } from '../lib/utils';
import { Time } from '../lib/time';
import { locale } from '../lib/locale';
import { icons } from '../lib/icons';
import { blockContainer } from '../lib/styles';
import type { Option } from '../elements/select';

import '../elements/radio';
import '../elements/button';
import '../elements/date-panel';
import '../elements/time-panel';
import '../elements/select';
import '../elements/input';

export type FilterableType = 'string' | 'number' | 'date' | 'date-time' | 'time' | 'duration' | 'enum';

export type FilterableOptions = {
  type?: FilterableType;
  // enum
  getOptions?: (provider?: string) => Option[] | undefined;
  getProviders?: () => Option[] | undefined;
  connectStores?: Store<any>[];
};

const style = createCSSSheet(css`
  dy-input,
  dy-select {
    width: 100%;
  }
  dy-input-group.duration dy-select,
  dy-input-group.filter dy-select {
    flex-grow: 5;
  }
  dy-select {
    max-height: 13.2em;
  }
  dy-time-panel {
    height: 15em;
  }
  .line {
    margin-block-end: 1em;
  }
  .filter {
    margin-block-end: 0.5em;
  }
`);

const durationUnitList = [
  { label: locale.minute, value: 1000 * 60 },
  { label: locale.hour, value: 1000 * 60 * 60 },
];

type State = {
  comparerType: ComparerType;
  value: string | number | string[];
  /**duration */
  durationUnit: number;
  /**enum*/
  search: string;
  provider?: string;
};

export type SubmitValue = Pick<State, 'comparerType' | 'value'>;

const defaultState: State = {
  comparerType: ComparerType.Eq,
  value: '',
  durationUnit: durationUnitList[0].value,
  search: '',
  provider: undefined,
};

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

  @emitter submit: Emitter<SubmitValue>;

  get #type() {
    return this.options?.type || 'string';
  }

  get #durationValue() {
    return ((Number(this.state.value) || 0) / this.state.durationUnit).toString();
  }

  get #comparerList(): ComparerType[] {
    switch (this.#type) {
      case 'enum':
        return [ComparerType.Have, ComparerType.Miss];
      case 'string':
        return [ComparerType.Have, ComparerType.Miss, ComparerType.Eq];
      default:
        return [ComparerType.Lte, ComparerType.Gte];
    }
  }

  get #disabled() {
    const { value } = this.state;
    switch (this.#type) {
      case 'enum':
        return !Array.isArray(value) || !value.length;
      default:
        return !value;
    }
  }

  state: State = { ...defaultState };

  #onSubmit = () => {
    if (this.#disabled) return;
    const { comparerType, value } = this.state;
    this.submit({ comparerType, value });
  };

  #onChangeValue = ({ detail }: CustomEvent<string>) => {
    this.setState({ value: detail });
  };

  #onChangeDataValue = ({ detail }: CustomEvent<number>) => {
    this.setState({
      value: String(this.state.comparerType === ComparerType.Lte ? new Time(detail).endOf('d').valueOf() : detail),
    });
  };

  #onChangeTimeValue = ({ detail }: CustomEvent<number>) => {
    this.setState({
      value: String(new Time(detail).diff(new Time(detail).startOf('d'))),
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
      case 'date':
      case 'date-time':
        return html`
          <dy-date-panel
            ?time=${this.#type === 'date-time'}
            @change=${this.#type === 'date' ? this.#onChangeDataValue : this.#onChangeValue}
            .value=${this.state.value === '' ? undefined : Number(this.state.value)}
          ></dy-date-panel>
        `;
      case 'time':
        return html`
          <dy-time-panel
            @change=${this.#onChangeTimeValue}
            .value=${this.state.value === '' ? undefined : Number(this.state.value) + new Time().startOf('d').valueOf()}
          ></dy-time-panel>
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
                          .placeholder=${locale.filter}
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

  willMount = () => {
    this.memo(
      () => {
        this.state = { ...defaultState, comparerType: this.#comparerList[0] };
      },
      () => [this.options],
    );
    this.memo(
      () => Object.assign(this.state || {}, this.initValue),
      () => [],
    );
  };

  mounted = () => {
    this.effect(
      () => {
        const disconnects = this.options?.connectStores?.map((e) => connect(e, this.update));
        return () => disconnects?.forEach((disconnect) => disconnect());
      },
      () => [this.options],
    );
  };

  render = () => {
    const { comparerType } = this.state;
    return html`
      ${this.#comparerList.map(
        (e) => html`
          <div class="line">
            <dy-radio ?checked=${e === comparerType} @change=${() => this.setState({ comparerType: e, value: '' })}>
              ${this.getText?.(e) || e}
            </dy-radio>
          </div>
          <div class="line">${e === comparerType ? this.#renderInput() : ''}</div>
        `,
      )}
      <dy-button ?disabled=${this.#disabled} @click=${this.#onSubmit}>${locale.ok}</dy-button>
    `;
  };

  initValue?: Partial<SubmitValue>;
}
