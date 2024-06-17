// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import { MP4Demuxer } from './demuxer_mp4';

// https://w3c.github.io/webcodecs/samples/video-decode-display/worker.js

const frameList: VideoFrame[] = [];

const decoder = new VideoDecoder({
  output: (e) => {
    frameList.push(e);
  },
  error: console.error,
});

new MP4Demuxer('https://storage.googleapis.com/media-session/caminandes/short.mp4', {
  onConfig(config: VideoDecoderConfig) {
    decoder.configure(config);
  },
  onChunk(chunk: EncodedVideoChunk) {
    decoder.decode(chunk);
  },
  setStatus: (_e: any) => {
    //
  },
});

let timer = 0;
self.addEventListener('message', (e) => {
  self.cancelAnimationFrame(timer);

  const { canvas, ratio } = e.data as { canvas: OffscreenCanvas; ratio: number };
  const ctx = canvas.getContext('2d')!;
  const draw = () => {
    const frame = frameList.shift();
    if (frame) {
      const { codedWidth: width, codedHeight: height } = frame;
      ctx.drawImage(frame, 0, 0, width / ratio, height / ratio);
      const pixels = ctx.getImageData(0, 0, width / ratio, height / ratio).data.buffer;
      frame.close();
      try {
        self.postMessage(
          {
            width,
            height,
            pixels,
            canvasKey: width * height,
          },
          { transfer: [pixels] },
        );
      } catch (err) {
        console.error(err);
      }
    }
    timer = self.requestAnimationFrame(draw);
  };
  timer = self.requestAnimationFrame(draw);
});
