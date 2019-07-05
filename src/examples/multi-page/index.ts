import { Component, html, css } from '../../'
import './page-a'
import './page-b'
import '../../components/link'
import '../../components/route'

const routes = [
  {
    pattern: '/a',
    component: html`
      <app-page-a>A: </app-page-a>
    `,
  },
  {
    pattern: '/b',
    component: html`
      <app-page-b>B: </app-page-b>
    `,
  },
  {
    pattern: '/',
    component: html`
      <div>hello</div>
    `,
  },
]

class App extends Component {
  render() {
    return html`
      <style>
        :host {
          text-align: center;
        }
        gem-link {
          cursor: pointer;
        }
        gem-link:hover {
          text-decoration: underline;
        }
      </style>
      <nav>
        <gem-link path="/">Home</gem-link>
        <gem-link path="/a">PageA</gem-link>
        <gem-link path="/b">PageB</gem-link>
      </nav>
      <main>
        <gem-route .routes=${routes}></gem-route>
      </main>
    `
  }
}

const style = document.createElement('style')
style.innerHTML = css`
  body {
    font-size: xx-large;
  }
`
document.head.append(style)

customElements.define('app-root', App)
document.body.append(new App())
