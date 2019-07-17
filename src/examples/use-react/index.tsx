import React from 'react';
import { html, render } from '../..';
import '../../elements/use-react';

function App(props: { name: React.ReactNode }) {
  return <div className="App">Hello {props.name}!</div>;
}

render(
  html`
    <gem-use-react .component=${App} .prop=${{ name: 'React' }}></gem-use-react>
  `,
  document.body,
);
