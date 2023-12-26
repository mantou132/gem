import { raw } from '@mantou/gem';

export const icons = {
  github: raw`
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path fill="currentColor" d="M8 0a8.1 8.1 0 0 0-8 8.2c0 3.63 2.3 6.7 5.47 7.79l.14.01c.3 0 .4-.22.4-.4v-1.4c-.3.06-.57.1-.81.1-1.54 0-1.89-1.2-1.89-1.2-.36-.95-.89-1.2-.89-1.2-.7-.5 0-.5.05-.5.8.06 1.23.84 1.23.84.4.7.94.9 1.41.9.38 0 .72-.12.92-.21.07-.53.28-.9.5-1.1-1.77-.2-3.64-.91-3.64-4.05 0-.9.31-1.63.82-2.2-.08-.21-.35-1.05.08-2.18l.18-.01c.3 0 .94.1 2.02.86a7.5 7.5 0 0 1 4.01 0c1.08-.75 1.73-.86 2.02-.86l.18.01c.44 1.13.16 1.97.08 2.18.5.57.82 1.3.82 2.2 0 3.15-1.87 3.84-3.65 4.04.28.25.54.75.54 1.52l-.01 2.25c0 .2.1.41.4.41l.15-.01A8.19 8.19 0 0 0 16 8.2 8.1 8.1 0 0 0 8 0Z"/>
    </svg>
  `,
  menu: raw`
    <svg part="icon" aria-hidden="true" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>
    </svg>
  `,
  close: raw`
    <svg part="icon" aria-hidden="true" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
    </svg>
  `,
  i18n: raw`
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none"></path>
      <path
        d=" M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z "
        fill="currentColor"
      ></path>
    </svg>
  `,
  arrow: raw`
    <svg
      aria-hidden="true"
      width="6"
      height="10"
      viewBox="0 0 6 10"
      fill="none"
    >
      <path d="M1.4 8.56L4.67 5M1.4 1.23L4.66 4.7" stroke="currentColor" stroke-linecap="square"></path>
    </svg>
  `,
  link: raw`
    <svg  part="icon" aria-hidden="true" viewBox="0 0 100 100" width="15" height="15">
      <path
        fill="currentColor"
        d="M18.8,85.1h56l0,0c2.2,0,4-1.8,4-4v-32h-8v28h-48v-48h28v-8h-32l0,0c-2.2,0-4,1.8-4,4v56C14.8,83.3,16.6,85.1,18.8,85.1z"
      ></path>
      <polygon
        fill="currentColor"
        points="45.7,48.7 51.3,54.3 77.2,28.5 77.2,37.2 85.2,37.2 85.2,14.9 62.8,14.9 62.8,22.9 71.5,22.9"
      ></polygon>
    </svg>
  `,
  compose: raw`
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      width="32"
      height="32"
      fill="none"
      stroke="currentcolor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      class="icon"
    >
      <path
        data-v-49573232=""
        d="M27 15 L27 30 2 30 2 5 17 5 M30 6 L26 2 9 19 7 25 13 23 Z M22 6 L26 10 Z M9 19 L13 23 Z"
      ></path>
    </svg>
  `,
  check: raw`
    <svg
      part="icon"
      aria-hidden="true"
      height="24px"
      viewBox="0 0 24 24"
      width="24px"
      fill="currentColor"
    >
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
    </svg>
  `,
  copy: raw`
    <svg
      part="icon"
      aria-hidden="true"
      height="24px"
      viewBox="0 0 24 24"
      width="24px"
      fill="currentColor"
    >
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path
        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
      ></path>
    </svg>
  `,
  anchor: raw`
    <svg aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="16" height="16">
      <path
        fill-rule="evenodd"
        d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"
      ></path>
    </svg>
  `,
  forward: raw`
    <svg part="icon" aria-hidden="true" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path>
      
    </svg>
  `,
  delete: raw`
    <svg part="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"></path>
    </svg>
  `,
  add: raw`
    <svg part="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path>
      
    </svg>
  `,
};
