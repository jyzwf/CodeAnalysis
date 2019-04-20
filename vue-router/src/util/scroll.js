/* @flow */

import type Router from '../index'
import { assert } from './warn'
import { getStateKey, setStateKey } from './push-state'

const positionStore = Object.create(null)

export function setupScroll () {
  debugger
	// Fix for #1585 for Firefox
	// Fix for #2195 Add optional third attribute to workaround a bug in safari https://bugs.webkit.org/show_bug.cgi?id=182678
	window.history.replaceState(
    { key: getStateKey() },
    '',
    window.location.href.replace(window.location.origin, ''),
  )

	// 调用history.pushState()或history.replaceState()不会触发popstate事件。
	// 只有在做出浏览器动作时，才会触发该事件，如用户点击浏览器的回退按钮
	window.addEventListener('popstate', (e) => {
    saveScrollPosition()
		debugger;
    if (e.state && e.state.key) {
      // 如果当前有key,在 pushState 时候存入
      setStateKey(e.state.key) // 就设置当前的 _key
		}
  })
}

export function handleScroll (
  router: Router,
  to: Route,
  from: Route,
  isPop: boolean,
) {
  if (!router.app) {
    return
	}

  debugger
	const behavior = router.options.scrollBehavior
	if (!behavior) {
    return
	}

  if (process.env.NODE_ENV !== 'production') {
    assert(
      typeof behavior === 'function',
      `scrollBehavior must be a function`,
    )
	}

  // wait until re-render finishes before scrolling
  router.app.$nextTick(() => {
    const position = getScrollPosition()
		const shouldScroll = behavior.call(
      router,
      to,
      from,
      isPop ? position : null,
    )

		if (!shouldScroll) {
      return
		}

    if (typeof shouldScroll.then === 'function') {
      // 一个promise
      shouldScroll
        .then((shouldScroll) => {
          scrollToPosition((shouldScroll: any), position)
				})
        .catch((err) => {
          if (process.env.NODE_ENV !== 'production') {
            assert(false, err.toString())
					}
        })
		} else {
      scrollToPosition(shouldScroll, position)
		}
  })
}

export function saveScrollPosition () {
  const key = getStateKey() // 如果跳入一个新页面的时候，是没有key的，只有返回的时候才有
	if (key) {
    positionStore[key] = {
      x: window.pageXOffset,
      y: window.pageYOffset
    }
	}
}

function getScrollPosition (): ?Object {
  const key = getStateKey() // 如果跳入一个新页面的时候，是没有key的，只有返回的时候才有
	if (key) {
    return positionStore[key]
	}
}

function getElementPosition (el: Element, offset: Object): Object {
  const docEl: any = document.documentElement
	const docRect = docEl.getBoundingClientRect()
	const elRect = el.getBoundingClientRect()
	return {
    x: elRect.left - docRect.left - offset.x,
    y: elRect.top - docRect.top - offset.y
  }
}

function isValidPosition (obj: Object): boolean {
  return isNumber(obj.x) || isNumber(obj.y)
}

function normalizePosition (obj: Object): Object {
  return {
    x: isNumber(obj.x) ? obj.x : window.pageXOffset,
    y: isNumber(obj.y) ? obj.y : window.pageYOffset
  }
}

function normalizeOffset (obj: Object): Object {
  return {
    x: isNumber(obj.x) ? obj.x : 0,
    y: isNumber(obj.y) ? obj.y : 0
  }
}

function isNumber (v: any): boolean {
  return typeof v === 'number'
}

function scrollToPosition (shouldScroll, position) {
  // 可以指定滚动元素，并执行滚动行为
  const isObject = typeof shouldScroll === 'object'
	if (isObject && typeof shouldScroll.selector === 'string') {
    const el = document.querySelector(shouldScroll.selector)
		if (el) {
      // 在一个元素内部滚动
      let offset =
				shouldScroll.offset && typeof shouldScroll.offset === 'object'
				  ? shouldScroll.offset
				  : {}
			offset = normalizeOffset(offset)
			position = getElementPosition(el, offset)
		} else if (isValidPosition(shouldScroll)) {
      position = normalizePosition(shouldScroll)
		}
  } else if (isObject && isValidPosition(shouldScroll)) {
    position = normalizePosition(shouldScroll)
	}

  if (position) {
    window.scrollTo(position.x, position.y)
	}
}
