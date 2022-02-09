import { adoptedStyle, customElement, emitter, Emitter, property, state } from '@mantou/gem/lib/decorators';
import { html, svg } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap } from '@mantou/gem/lib/utils';
import { geoProjection, geoMercatorRaw, geoEquirectangularRaw, GeoRawProjection, geoPath } from 'd3-geo';

import { theme } from '../lib/theme';

import type { PanEventDetail } from './gesture';
import { DuoyunLoadableBaseElement } from './base/loadable';

import './gesture';

export type { PanEventDetail } from './gesture';

// https://github.com/d3/d3-geo/blob/main/src/projection/equirectangular.js
// https://github.com/d3/d3-geo/blob/main/src/projection/mercator.js
const customProjectionRaw = (lambda: number, phi: number): [number, number] => {
  const limit = (Math.PI / 180) * 53;
  const maxPhi = (Math.PI / 180) * 95;
  const total = maxPhi - limit;
  const [, y1] = (geoEquirectangularRaw as any)(lambda, phi);
  const [, y2] = (geoMercatorRaw as any)(lambda, phi);
  const phiAbs = Math.abs(phi);
  const ratio = phiAbs > limit ? (phiAbs - limit) / total : 0;
  const y = y1 * ratio + y2 * (1 - ratio);
  return [lambda, y];
};
// TODO: implement `invert`

export const geoCommonProjection = () => geoProjection(customProjectionRaw as GeoRawProjection).scale(152.63);

// viewbox 1
// https://www.zhangxinxu.com/sp/svgo/
export const shapes = [
  // 圆
  {
    strokeScale: 1,
    scale: 2,
    d: 'M1 .36A.5.5 0 0 1 .64 1 .5.5 0 0 1 0 .64a.42.42 0 0 1 0-.27A.49.49 0 0 1 .63 0 .51.51 0 0 1 1 .29z',
  },
  // 三边形
  {
    strokeScale: 0.9,
    scale: 2,
    d: 'M.5109 0.01L.0087 .88h1.0046L.5109 .01z',
  },
  // 菱形
  {
    strokeScale: 0.8,
    scale: 2,
    d: 'M0.00704 0.5071l0.5-0.5 0.5 0.5-0.5 0.5z',
  },
  // 五边形
  {
    strokeScale: 0.8,
    scale: 2,
    d: 'M0.5030.0062L0.0059 0.3674l0.1899 0.5844h0.6145l0.19-0.5844L0.5030.0062z',
  },
  // 六角
  {
    strokeScale: 0.7,
    scale: 2.5,
    d: 'M.73.48L.86.25H.6L.43 0 .3.23H0l.13.25L0 .75h.26L.43 1 .56.77h.3L.73.52V.48z',
  },
  // 四角
  {
    strokeScale: 0.7,
    scale: 3,
    d: 'M0.4974 0L0.3709 0.3726 0 0.4988l0.3692 0.1286L0.4974 1l0.1255-0.372L0.9972 0.5 0.6263 0.3744z',
  },
  // 五角
  {
    strokeScale: 0.7,
    scale: 2.5,
    d: 'M0.5107 0.8l-0.309 0.1624 0.059-0.344-0.25-0.2437 0.3455-0.0502L0.5107 0.0113l0.1546 0.3131 0.3454 0.0502-0.25 0.2437 0.0591 0.344-0.3091-0.1624z',
  },
  // 正方形
  {
    strokeScale: 0.9,
    scale: 2,
    d: 'M0 0L0 1L1 1L1 0z',
  },
];

const style = createCSSSheet(css`
  :host {
    display: block;
    border-radius: ${theme.normalRound};
    background-color: ${theme.lightBackgroundColor};
    aspect-ratio: 2 / 1;
  }
  svg {
    overflow: visible;
  }
  .area {
    stroke: ${theme.backgroundColor};
    transition: opacity 0.3s ${theme.timingFunction};
  }
  .area.current:not(.disabled):hover {
    opacity: 0.8;
  }
  .name {
    fill: ${theme.textColor};
    stroke: ${theme.backgroundColor};
    paint-order: stroke;
    pointer-events: none;
    text-anchor: middle;
  }
  .node {
    paint-order: stroke;
    transform-origin: center;
    transform-box: fill-box;
    stroke-opacity: 0.4;
    --translate: calc(-50% + var(--x)), calc(-50% + var(--y));
    transform: translate(var(--translate)) scale(var(--scale));
    /* await chrome implement */
    transition: scale 0.3s ${theme.timingFunction};
  }
  .node.current:hover {
    transform: translate(var(--translate)) scale(calc(var(--scale) * 1.5));
  }
`);

type Area = {
  name: string;
  path: string | null;
  center: number[];
};

export type GeoCommonProjection = typeof geoCommonProjection;
export type Geo = GeoJSON.FeatureCollection;

export type Node = {
  id: string;
  type?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7';
  position: number[];
};

type State = {
  currentNode?: Node;
  currentArea?: Area;
};

export type NodeEventDetail = { id: string; originEvent: MouseEvent };
export type AreaEventDetail = { name: string; originEvent: MouseEvent };

/**
 * @customElement dy-map
 * @fire nodehover
 * @fire nodeleave
 * @fire nodeclick
 * @fire areahover
 * @fire arealeave
 * @fire areaclick
 */
@customElement('dy-map')
@adoptedStyle(style)
export class DuoyunMapElement extends DuoyunLoadableBaseElement<State> {
  @property getProjection?: (fn: GeoCommonProjection) => ReturnType<GeoCommonProjection>;
  @property geo?: Geo;
  @property getAreaColor?: (name: string, isCurrent: boolean) => string | undefined;
  @property getAreaName?: (name: string, isCurrent: boolean) => string | undefined;
  @property nodes?: Node[];
  @property getNodeColor?: (id: string, isCurrent: boolean) => string | undefined;

  @property scale = 1;
  @property translate2D = [0, 0];

  @state grabbing: boolean;

  @emitter pan: Emitter<PanEventDetail>;
  // id
  @emitter nodehover: Emitter<NodeEventDetail>;
  @emitter nodeleave: Emitter<NodeEventDetail>;
  @emitter nodeclick: Emitter<NodeEventDetail>;
  // name
  @emitter areahover: Emitter<AreaEventDetail>;
  @emitter arealeave: Emitter<AreaEventDetail>;
  @emitter areaclick: Emitter<AreaEventDetail>;

  constructor() {
    super();
    this.internals.role = 'img';
  }

  state: State = {};

  #projection: ReturnType<GeoCommonProjection>;
  #areas?: Area[];

  #onPan = ({ detail }: CustomEvent<PanEventDetail>) => {
    this.grabbing = true;
    this.pan(detail);
  };

  #onEnd = () => {
    this.grabbing = false;
  };

  #onLeaveArea = (detail: AreaEventDetail) => {
    this.arealeave(detail);
    this.setState({ currentArea: undefined });
  };

  #onLeaveNode = (detail: NodeEventDetail) => {
    this.nodeleave(detail);
    this.setState({ currentNode: undefined });
  };

  willMount = () => {
    this.memo(
      () => {
        this.#projection = this.getProjection?.(geoCommonProjection) || geoCommonProjection();
        const pathFn = geoPath().projection(this.#projection);
        this.#areas = this.geo?.features.map(({ geometry, properties }) => {
          return {
            path: pathFn(geometry),
            center: pathFn.centroid(geometry),
            name: (properties && (properties.name || properties.NAME)) || '',
          };
        });
      },
      () => [this.geo, this.getProjection],
    );
  };

  #renderArea = (area: Area, isCurrent: boolean) => {
    const { name, path } = area;
    const color = this.getAreaColor?.(name, isCurrent);
    const onMouseover = (originEvent: MouseEvent) => {
      if (isCurrent) {
        this.areahover({ name, originEvent });
      } else {
        this.setState({ currentArea: area });
      }
    };
    return svg`
      <path
        class=${classMap({ area: true, disabled: !color, current: isCurrent })}
        d=${path}
        stroke-width=${0.1 / this.scale}
        fill=${color || theme.disabledColor}
        @click=${(originEvent: MouseEvent) => this.areaclick({ name, originEvent })}
        @mouseover=${onMouseover}
        @mouseout=${(originEvent: MouseEvent) => isCurrent && this.#onLeaveArea({ name, originEvent })}
      ></path>
    `;
  };

  #renderName = ({ name, center: [x, y] }: Area, isCurrent: boolean) => {
    return svg`
      <text
        class=${classMap({ name: true, current: isCurrent })}
        x=${x}
        y=${y}
        font-size=${2.5 / this.scale}
        stroke-width=${0.5 / this.scale}>
        ${this.getAreaName?.(name, isCurrent)}
      </text>
    `;
  };

  #renderNode = (node: Node, isCurrent: boolean) => {
    const { id, type = '0', position: pos } = node;
    const position = this.#projection(pos as [number, number]) || [0, 0];
    const color = this.getNodeColor?.(id, isCurrent) || theme.textColor;
    const shape = shapes[type];
    const scale = shape.scale / this.scale;
    const onMouseover = (originEvent: MouseEvent) => {
      if (isCurrent) {
        this.nodehover({ id, originEvent });
      } else {
        this.setState({ currentNode: node });
      }
    };
    return svg`
      <path
        class=${classMap({ node: true, current: isCurrent })}
        style=${`--x: ${position[0]}px; --y: ${position[1]}px; --scale: ${scale}`}
        d=${shape.d}
        fill=${color}
        stroke=${theme.backgroundColor}
        stroke-width=${(2 / scale) * shape.strokeScale}
        @click=${(originEvent: MouseEvent) => this.nodeclick({ id, originEvent })}
        @mouseover=${onMouseover}
        @mouseout=${(originEvent: MouseEvent) => isCurrent && this.#onLeaveNode({ id, originEvent })}
      ></path>
    `;
  };

  render = () => {
    const { currentArea, currentNode } = this.state;
    return html`
      <dy-gesture @pan=${this.#onPan} @end=${this.#onEnd}>
        ${svg`
          <svg
            part="svg"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-180 -90 360 180"
            aria-hidden="true"
            style=${styleMap({
              transform: `scale(${this.scale}) translate(${this.translate2D[0]}px, ${this.translate2D[1]}px)`,
            })}>
            ${this.#areas?.map((area) => (area === currentArea ? '' : this.#renderArea(area, false)))}
            ${currentArea ? this.#renderArea(currentArea, true) : ''}
            ${this.#areas?.map((area) => this.#renderName(area, false))}
            ${currentArea ? this.#renderName(currentArea, true) : ''}
            ${this.#areas && this.nodes?.map((node) => (node === currentNode ? '' : this.#renderNode(node, false)))}
            ${currentNode ? this.#renderNode(currentNode, true) : ''}
          </svg>
        `}
      </dy-gesture>
    `;
  };
}
