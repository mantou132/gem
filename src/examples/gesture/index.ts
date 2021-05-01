import { render, GemElement, html, customElement, refobject, RefObject } from '../..';

import '../../elements/gesture';
import { PanEventDetail, PinchEventDetail, RotateEventDetail, SwipeEventDetail } from '../../elements/gesture';
import '../elements/layout';
import './canvas';

@customElement('app-root')
export class AppRoot extends GemElement {
  @refobject gestureRef: RefObject<any>;
  state = {
    x: 0,
    y: 0,
    duration: 0,
    scale: 1,
    rotate: 0,
    swipe: '',
    moves: [],
  };
  onPan = (evt: CustomEvent<PanEventDetail>) => {
    const { detail } = evt;
    const { x, y } = this.state;
    this.setState({ x: detail.x + x, y: detail.y + y, duration: 0 });
  };
  onPinch = (evt: CustomEvent<PinchEventDetail>) => {
    this.setState({ scale: evt.detail.scale * this.state.scale });
  };
  onRotate = (evt: CustomEvent<RotateEventDetail>) => {
    this.setState({ rotate: evt.detail.rotate + this.state.rotate });
  };
  onSwipe = (e: CustomEvent<SwipeEventDetail>) => {
    this.setState({ swipe: `${e.detail.direction}, speed: ${e.detail.speed}` });
  };
  onEnd = () => {
    this.setState({
      x: 0,
      y: 0,
      duration: 0.5,
      scale: 1,
      rotate: 0,
      swipe: '',
      moves: [...this.gestureRef.element.movesMap.values().next().value],
    });
  };
  render() {
    const { x, y, scale, rotate, duration, swipe, moves } = this.state;
    return html`
      <style>
        img {
          translate: ${x}px ${y}px;
          scale: ${scale};
          rotate: ${rotate}deg;
          transition: all ${duration}s;
        }
      </style>
      <gem-gesture
        ref=${this.gestureRef.ref}
        @pan=${this.onPan}
        @end=${this.onEnd}
        @pinch=${this.onPinch}
        @rotate=${this.onRotate}
        @press=${console.log}
        @swipe=${this.onSwipe}
        touch-action="pan-y"
      >
        <gem-gesture
          @pan=${console.log}
          @end=${console.log}
          @pinch=${console.log}
          @rotate=${console.log}
          @press=${console.log}
          @swipe=${console.log}
          touch-action="pan-y"
        >
          <img src="https://gem-book.js.org/logo.png" width="200" />
        </gem-gesture>
        <div>${moves[moves.length - 1] ? `${JSON.stringify(moves[moves.length - 1])}` : ''}</div>
        <div>${swipe}</div>
        <app-canvas .data=${moves}></app-canvas>
      </gem-gesture>
    `;
  }
}

render(
  html`
    <style>
      body {
        overscroll-behavior: contain;
      }
    </style>
    <gem-examples-layout>
      <app-root slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
