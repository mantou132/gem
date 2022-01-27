import { raw } from '@mantou/gem/lib/utils';

import { luminance, hslToRgb, HSL, HexColor, rgbToHexColor, parseHexColor } from './color';

export function createCanvas(width?: number, height?: number) {
  const canvas = document.createElement('canvas');
  if (width) {
    canvas.width = width;
    canvas.height = height || width;
  }
  return canvas;
}

export function createDataURLFromSVG(raw: string) {
  return `data:image/svg+xml;base64,${window.btoa(raw)}`;
}

// if `bg` is't `HexColor`, text fill color error
export function createSVGFromText(text: string, backgroundColor?: string) {
  const hslRange = [
    [0, 1],
    [0.2, 0.7],
    [0.3, 0.6],
  ];
  const rgb = backgroundColor?.startsWith('#')
    ? parseHexColor(backgroundColor as HexColor)
    : hslToRgb(
        Array.from({ length: 3 }, (_, i) => {
          const total = Math.floor(Math.random() * 256) / 255;
          return hslRange[i][0] + total * (hslRange[i][1] - hslRange[i][0]);
        }) as unknown as HSL,
      );
  const bg = backgroundColor || rgbToHexColor(rgb);
  const color = luminance(rgb) < 0.2 ? '#fff4' : '#0004';
  const getTranslate = () => Math.random() / 5;
  const getRotate = () => (Math.random() - 0.5) * 45;

  const strs = [...text].map(
    (char) => `<text
      x="50%"
      y="50%"
      dominant-baseline="middle"
      text-anchor="middle"
      transform="translate(${getTranslate()}, ${getTranslate()}) rotate(${getRotate()})"
    >${char}</text>`,
  );
  return raw`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="300"
      height="300"
      viewBox="0 0 1 1"
      style="background: ${bg}; fill: ${color}; font: 1px sans-serif">
      ${strs.join('')}
    </svg>
  `;
}

export interface CreateBitmapFromSvgOptions {
  width?: number;
  height?: number;
  type?: `image/${'png' | 'jpeg'}`;
  quality?: number;
}
export async function createBitmapFromSvg(
  svg: string,
  { width = 512, height = 512, type, quality }: CreateBitmapFromSvgOptions = {},
) {
  const img = new Image();
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ctx is null');
  img.src = createDataURLFromSVG(svg);
  await new Promise((res) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      res(null);
    };
  });
  return new Promise<File>((res) => {
    canvas.toBlob(
      (b) => {
        if (!b) throw new Error();
        res(new File([b], '', { type: b.type }));
      },
      type,
      quality,
    );
  });
}

export function createDataURLFromBlob(blob: Blob) {
  const reader = new FileReader();
  return new Promise<string>((res) => {
    reader.addEventListener(
      'load',
      () => {
        res(reader.result as string);
      },
      false,
    );
    reader.readAsDataURL(blob);
  });
}

interface LimitOption {
  fileSize?: number;
  dimension?: { width: number; height: number };
}
interface OutputOption {
  aspectRatio?: number;
  /**Default: File */
  type?: 'url';
}

export function compressionImage(
  origin: HTMLImageElement | File,
  limit: LimitOption,
  output: OutputOption & { type: 'url' },
): Promise<string>;
export function compressionImage(origin: HTMLImageElement | File, limit: LimitOption): Promise<File>;
export async function compressionImage(
  origin: HTMLImageElement | File,
  limit: LimitOption,
  { aspectRatio, type }: OutputOption = {},
) {
  const originIsFile = origin instanceof Blob;
  const outputDataURL = type === 'url';
  if (!originIsFile && !outputDataURL) throw new Error('not support `HTMLImageElement` to `File`');
  const canvas = createCanvas();
  try {
    let img = new Image();
    let file = new File([], '');
    const loadImg = async () => {
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
    };
    if (originIsFile) {
      img.crossOrigin = 'anonymous';
      img.src = await createDataURLFromBlob(origin);
      await loadImg();
      file = origin;
    } else {
      img = origin;
      if (!img.complete) await loadImg();
      if (limit.fileSize) {
        const res = await fetch(origin.currentSrc);
        const blob = await res.blob();
        const type = res.headers.get('content-type');
        file = new File([blob], 'temp', { type: type?.startsWith('image/') ? type : '' });
      }
    }
    const rate = Math.min(
      limit.fileSize ? Math.sqrt(limit.fileSize / file.size) : 1,
      limit.dimension ? limit.dimension.width / img.naturalWidth : 1,
      limit.dimension ? limit.dimension.height / img.naturalHeight : 1,
    );
    if (rate >= 1) {
      return Promise.resolve(outputDataURL ? img.currentSrc : file);
    }
    const naturalAspectRatio = img.naturalWidth / img.naturalHeight;
    aspectRatio = aspectRatio || naturalAspectRatio;
    const widthRatio = aspectRatio > naturalAspectRatio ? 1 : aspectRatio / naturalAspectRatio;
    const heightRatio = aspectRatio > naturalAspectRatio ? naturalAspectRatio / aspectRatio : 1;
    const width = img.naturalWidth * rate;
    const height = img.naturalHeight * rate;
    canvas.width = width * widthRatio;
    canvas.height = height * heightRatio;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('ctx is null');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    if (outputDataURL) return Promise.resolve(canvas.toDataURL());
    return new Promise<File>((res, rej) =>
      canvas.toBlob((blob) => {
        if (!blob) return rej();
        res(new File([blob], 'compressed', { type: blob.type }));
      }),
    );
  } catch (err) {
    throw err;
  }
}
