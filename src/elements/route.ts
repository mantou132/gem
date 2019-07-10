import { GemElement, history, TemplateResult, updateStore } from '../'

class ParamsRegExp extends RegExp {
  namePosition: object
  constructor(pattern: string) {
    const namePosition = {}
    let i = 0
    super(
      `^${pattern.replace(/:([^/$]+)/g, (_m, name: string) => {
        namePosition[name] = i++
        return `([^/]+)`
      })}$`,
    )
    this.namePosition = namePosition
  }
}

function getReg(pattern: string) {
  return new ParamsRegExp(pattern)
}

// `/a/b/:c/:d` `/a/b/1/2`
function getParams(pattern: string, path: string) {
  const reg = getReg(pattern)
  const matchResult = path.match(reg)
  if (matchResult) {
    const params = {}
    Object.keys(reg.namePosition).forEach(name => {
      params[name] = matchResult[reg.namePosition[name] + 1]
    })
    return params
  }
}

function isMatch(pattern: string, path: string) {
  return !!path.match(getReg(pattern))
}

interface RouteItem {
  pattern: string
  content: TemplateResult
  title?: string
}

/**
 * @event change
 */
export class Route extends GemElement {
  static observedPropertys = ['routes']
  static observedStores = [history.historyState]

  static currentRoute: RouteItem

  // 获取当前匹配的路由的 params
  static getParams() {
    if (Route.currentRoute) {
      return getParams(Route.currentRoute.pattern, history.location.path)
    }
  }

  routes: RouteItem[]
  private href: string

  constructor() {
    super()
    const { path, query } = history.location
    const href = path + query
    this.href = href
  }
  initPage() {
    const { list, currentIndex } = history.historyState
    if (Route.currentRoute && Route.currentRoute.title && Route.currentRoute.title !== list[currentIndex].title) {
      list.splice(currentIndex, 1, {
        ...list[currentIndex],
        title: Route.currentRoute.title,
      })
      updateStore(history.historyState, {
        list,
      })
    }
  }

  shouldUpdate() {
    const { path, query } = history.location
    const href = path + query
    if (path + query !== this.href) {
      this.href = href
      return true
    }
    return false
  }

  mounted() {
    this.initPage()
  }

  updated() {
    this.initPage()
    this.dispatchEvent(new CustomEvent('change'))
  }

  render() {
    if (!this.routes) return this.callback()

    for (let item of this.routes) {
      const { pattern } = item
      if (isMatch(pattern, history.location.path)) {
        Route.currentRoute = item
        break
      }
    }

    if (!Route.currentRoute) return this.callback()
    return Route.currentRoute.content
  }

  callback() {
    Route.currentRoute = null
    return super.render()
  }
}

customElements.define('gem-route', Route)
