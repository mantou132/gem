import { createStore, type Store } from '@mantou/gem/lib/store';
import { raw } from '@mantou/gem/lib/utils';

// 24x24, single path
export function genIcon(d: string, ext = '') {
  return raw`
    <svg part="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path d="${d}"></path>
      ${ext}
    </svg>
  `;
}

const defaultIcons = {
  loading: genIcon(
    '',
    raw`
      <path class="bar1" d="M5 5h2.8v14h-2.8z"></path>
      <path class="bar2" d="M10.6 5h2.8v14h-2.8z"></path>
      <path class="bar3" d="M15.6 5h2.8v14h-2.8z"></path>
      <style>
        svg {
          opacity: 0.5;
        }
        path {
          transform-origin: center;
        }
        .bar1 {
          animation: grow 1.5s linear infinite;
        }
        .bar2 {
          animation: grow 1.5s linear -0.5s infinite;
        }
        .bar3 {
          animation: grow 1.5s linear -1s infinite;
        }
        @keyframes grow {
          0% {
            transform: scaleY(0);
            opacity: 0;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
          100% {
            transform: scaleY(0);
            opacity: 0;
          }
        }
      </style>
    `,
  ),
  search: genIcon(
    `M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z`,
  ),
  outward: genIcon(
    '',
    raw`
      <polygon points="6,6 6,8 14.59,8 5,17.59 6.41,19 16,9.41 16,18 18,18 18,6"></polygon>
    `,
  ),
  menu: genIcon(`M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z`),
  filter: genIcon(`M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z`),
  more: genIcon(
    `M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z`,
  ),
  close: genIcon(
    `M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z`,
  ),
  delete: genIcon(`M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z`),
  add: genIcon(`M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z`),
  right: genIcon(`M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z`),
  left: genIcon(`M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z`),
  expand: genIcon(`M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z`),
  sort: genIcon(
    '',
    raw`
      <path part="up" d="M8 13v-7.175L5.425 8.4l-1.425-1.4 5-5 5 5-1.425 1.4-2.575-2.575v7.175h-2Z"></path>
      <path part="down" d="M15 22 10 17l1.425-1.4 2.575 2.575v-7.175h2v7.175l2.575-2.575 1.425 1.4L15 22Z"></path>
    `,
  ),
  rollup: genIcon(`M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6z`),
  check: genIcon(`M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z`),
  date: genIcon(
    `M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z`,
  ),
  schedule: genIcon(
    `M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z`,
  ),
  copy: genIcon(
    `M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z`,
  ),
  info: genIcon(`M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z`),
  warning: genIcon(`M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z`),
  error: genIcon(`M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z`),
  success: genIcon(
    `M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z`,
  ),
  help: genIcon(
    `M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z`,
  ),
  star: genIcon(`M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24z`),
  colorize: genIcon(
    `M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z`,
  ),
  back: genIcon(`M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z`),
  forward: genIcon(`M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z`),
  tune: genIcon(
    `M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z`,
  ),
  visibility: genIcon(
    `M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z`,
  ),
  visibilityOff: genIcon(
    `M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z`,
  ),
  refresh: genIcon(
    `M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z`,
  ),
};

export const icons = createStore(defaultIcons);

export function extendIcons<T extends Record<string, string>>(customIcons: Partial<typeof defaultIcons> & T) {
  icons(customIcons);
  return icons as unknown as Store<typeof defaultIcons & T>;
}
