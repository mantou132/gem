import { PanEventDetail } from '@mantou/gem/elements/gesture';
import { GemElement, html, customElement, property, refobject, RefObject } from '@mantou/gem';

@customElement('app-canvas')
export class AppCanvas extends GemElement {
  @property data: PanEventDetail[];

  @refobject canvasRef: RefObject<HTMLCanvasElement>;
  @refobject canvasRef1: RefObject<HTMLCanvasElement>;
  render() {
    return html`
      <br />
      <canvas ref=${this.canvasRef.ref} style="border: 1px solid"></canvas>
      <canvas ref=${this.canvasRef1.ref} style="border: 1px solid"></canvas>
    `;
  }

  mounted() {
    const canvas = this.canvasRef.element!;
    const canvas1 = this.canvasRef1.element!;
    const ctx = canvas.getContext('2d')!;
    const ctx1 = canvas1.getContext('2d')!;
    canvas.height = 150;
    canvas1.height = 150;
    this.effect(() => {
      canvas.width = 0;
      canvas.width = 300;
      canvas1.width = 0;
      canvas1.width = 300;
      const maxX = [...this.data].sort(({ x }, { x: x1 }) => {
        if (x > x1) return -1;
        return 1;
      })[0]?.x;
      ctx.fillText(`Max movementX: ${maxX}`, 0, 8);
      const maxY = [...this.data].sort(({ y }, { y: y1 }) => {
        if (y > y1) return -1;
        return 1;
      })[0]?.y;
      ctx1.fillText(`Max movementY: ${maxY}`, 0, 8);
      console.log('x:', this.data.map(({ x }) => x).join());
      console.log('y:', this.data.map(({ y }) => y).join());
      console.log(
        'timeStamp interval:',
        this.data.reduce(
          (p, c, index) => (index ? `${p}, ${(c.timeStamp - this.data[index - 1].timeStamp).toFixed()}` : ''),
          '',
        ),
      );
      this.data.forEach((data, index) => {
        const y = 150 - data.x * (150 / maxX);
        const y1 = 150 - data.y * (150 / maxY);
        const x = index * (300 / this.data.length);
        if (index === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx1.beginPath();
          ctx1.moveTo(x, y1);
        } else {
          ctx.lineTo(x, y);
          ctx1.lineTo(x, y1);
        }
        if (index === this.data.length - 1) {
          ctx.stroke();
          ctx1.stroke();
        }
      });
    });
  }
}
