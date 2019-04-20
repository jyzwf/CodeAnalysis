/* @flow */

import type VueRouter from '../index'
import { parsePath, resolvePath } from './path'
import { resolveQuery } from './query'
import { fillParams } from './params'
import { warn } from './warn'
import { extend } from './misc'

export function normalizeLocation (
  raw: RawLocation,
  current: ?Route,
  append: ?boolean,
  router: ?VueRouter
): Location {
  // 规范化当前需要匹配的路径信息
  let next: Location = typeof raw === 'string' ? { path: raw } : raw
    // named target
    if (next.name || next._normalized) {
    // 已经规范化了(如在redirect的情况下)或者有name属性了
    return next
    }

  // relative params
  // next.path = “”
  // location.spec.js
  if (!next.path && next.params && current) {
    next = extend({}, next)
        next._normalized = true
        const params: any = extend(extend({}, current.params), next.params)
        if (current.name) {
      next.name = current.name
            next.params = params
        } else if (current.matched.length) {
      const rawPath = current.matched[current.matched.length - 1].path  // 最后的叶子路由
            next.path = fillParams(rawPath, params, `path ${current.path}`)
        } else if (process.env.NODE_ENV !== 'production') {
      warn(false, `relative params navigation requires a current route.`)
        }
    return next
    }

  const parsedPath = parsePath(next.path || '') // 找到 path、query、hash
    const basePath = (current && current.path) || '/'
    const path = parsedPath.path
    ? resolvePath(parsedPath.path, basePath, append || next.append)
    : basePath

    const query = resolveQuery(
    parsedPath.query,
    next.query,
    router && router.options.parseQuery
  )

    let hash = next.hash || parsedPath.hash
    if (hash && hash.charAt(0) !== '#') {
    hash = `#${hash}`
    }

  return {
    _normalized: true,
    path,
    query,
    hash
  }
}
