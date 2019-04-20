/* @flow */

import { inBrowser } from './dom'
import { saveScrollPosition } from './scroll'

export const supportsPushState =
	inBrowser &&
	(function () {
	  const ua = window.navigator.userAgent

		if (
	    (ua.indexOf('Android 2.') !== -1 ||
				ua.indexOf('Android 4.0') !== -1) &&
			ua.indexOf('Mobile Safari') !== -1 &&
			ua.indexOf('Chrome') === -1 &&
			ua.indexOf('Windows Phone') === -1
	  ) {
	    return false
		}

	  return window.history && 'pushState' in window.history
	})()

// use User Timing api (if present) for more accurate key precision
const Time =
	inBrowser && window.performance && window.performance.now
	  ? window.performance
	  : Date

let _key: string = genKey()

function genKey (): string {
  return Time.now().toFixed(3)
}

export function getStateKey () {
  return _key
}

export function setStateKey (key: string) {
  _key = key
}

export function pushState (url?: string, replace?: boolean) {
  saveScrollPosition() // 保留滚动条信息
	// try...catch the pushState call to get around Safari
	// DOM Exception 18 where it limits to 100 pushState calls
	const history = window.history
	try {
    if (replace) {
      history.replaceState({ key: _key }, '', url) // 替换url，为何重新设置下 key？？ replace的时候不是key已经是当前的 _key 了吗？
		} else {
      _key = genKey() // 重新生成一个key ,来保留当前的滚动信息
			history.pushState({ key: _key }, '', url) // 新增一条历史记录
		}
  } catch (e) {
    window.location[replace ? 'replace' : 'assign'](url) // 直接不支持history的情况，并且一定fallback=false时，直接替换
	}
}

export function replaceState (url?: string) {
  pushState(url, true)
}