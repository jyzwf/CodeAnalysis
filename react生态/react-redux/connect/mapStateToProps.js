import { wrapMapToPropsConstant, wrapMapToPropsFunc } from './wrapMapToProps'

export function whenMapStateToPropsIsFunction(mapStateToProps) {
    return (typeof mapStateToProps === 'function')
        ? wrapMapToPropsFunc(mapStateToProps, 'mapStateToProps')
        : undefined
}

// 不传入mapStateToProps时
export function whenMapStateToPropsIsMissing(mapStateToProps) {
    return (!mapStateToProps)
        ? wrapMapToPropsConstant(() => ({}))
        : undefined
}

// 按照该顺序保证了如果传入了mapStateToProps，就一定是函数，但可以不传
export default [
    whenMapStateToPropsIsFunction,
    whenMapStateToPropsIsMissing
]

