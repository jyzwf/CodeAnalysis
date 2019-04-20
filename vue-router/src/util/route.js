/* @flow */

import type VueRouter from '../index'
import { stringifyQuery } from './query'

const trailingSlashRE = /\/?$/

export function createRoute (
  record: ?RouteRecord,
  location: Location,
  redirectedFrom?: ?Location,
  router?: VueRouter
): Route {  // 创建路由对象
  // https://router.vuejs.org/zh/api/#parsequery-stringifyquery
  const stringifyQuery = router && router.options.stringifyQuery

    let query: any = location.query || {}
    try {
    query = clone(query)
    } catch (e) {}

  const route: Route = {
    name: location.name || (record && record.name),
    meta: (record && record.meta) || {},
    path: location.path || '/',
    hash: location.hash || '',
    query,
    params: location.params || {},
    fullPath: getFullPath(location, stringifyQuery), // 获得完整的 path+query+hash的路径
    matched: record ? formatMatch(record) : [] // 由于这里找到的是一个底层的节点，所以要找到所有的匹配节点就回归其父节点
  }
    if (redirectedFrom) { // 如果该函数有重定向而导致的调用
    route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery)
    }
  return Object.freeze(route)
}

function clone (value) {
  if (Array.isArray(value)) {
    return value.map(clone)
    } else if (value && typeof value === 'object') {
    const res = {}
        for (const key in value) {
      res[key] = clone(value[key])
        }
    return res
    } else {
    return value
    }
}

// the starting route that represents the initial state
export const START = createRoute(null, {
  path: '/'
})

function formatMatch (record: ?RouteRecord): Array<RouteRecord> {
  const res = []
    while (record) {
    res.unshift(record)
        record = record.parent
    }
  return res
}

function getFullPath ({ path, query = {}, hash = '' }, _stringifyQuery): string {
  const stringify = _stringifyQuery || stringifyQuery
    return (path || '/') + stringify(query) + hash
}

export function isSameRoute (a: Route, b: ?Route): boolean {
  if (b === START) { // 一开始的时候
    return a === b
    } else if (!b) {
    return false
    } else if (a.path && b.path) {
    return (
      a.path.replace(trailingSlashRE, '') ===
                b.path.replace(trailingSlashRE, '') &&
            a.hash === b.hash &&
            isObjectEqual(a.query, b.query)
    )
    } else if (a.name && b.name) {
    return (
      a.name === b.name &&
            a.hash === b.hash &&
            isObjectEqual(a.query, b.query) &&
            isObjectEqual(a.params, b.params)
    )
    } else {
    return false
    }
}

function isObjectEqual (a = {}, b = {}): boolean {
  // handle null value #1566
  if (!a || !b) return a === b
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) {
    return false
    }
  return aKeys.every(key => {
    const aVal = a[key]
        const bVal = b[key]
        // check nested equality
        if (typeof aVal === 'object' && typeof bVal === 'object') {
      return isObjectEqual(aVal, bVal)
        }
    return String(aVal) === String(bVal)
    })
}

export function isIncludedRoute (current: Route, target: Route): boolean {
  return (
    current.path
      .replace(trailingSlashRE, '/')
      .indexOf(target.path.replace(trailingSlashRE, '/')) === 0 &&
        (!target.hash || current.hash === target.hash) &&
        queryIncludes(current.query, target.query)
  )
}

function queryIncludes (
  current: Dictionary<string>,
  target: Dictionary<string>
): boolean {
  for (const key in target) {
    if (!(key in current)) {
      return false
        }
  }
  return true
}
