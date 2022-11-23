import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { dictionary } from "../utils/dynamicTypes.js"
import type { defined, keySet } from "../utils/generics.js"
import { keywords } from "./keywords.js"
import type { Never, Node, Unknown } from "./node.js"
import type { NodeOperator } from "./operations.js"

export const intersectCompositeSets = <set extends dictionary>(
    l: set,
    r: set
) => {}

export type AttributeIntersection<t> = (l: t, r: t) => t | Never

export type AttributeDifference<t> = (l: t, r: t) => t | null

export const intersectKeySets: AttributeIntersection<keySet> = (l, r) => ({
    ...l,
    ...r
})

export const subtractKeySets: AttributeDifference<keySet> = (l, r) => {
    const result = { ...l }
    for (const k in r) {
        delete result[k]
    }
    return isEmpty(result) ? null : result
}

// export const queryPath = (attributes: TypeNode, path: string) => {
//     // const segments = pathToSegments(path)
//     // let currentAttributes = attributes
//     // for (const segment of segments) {
//     //     if (currentAttributes.props?.[segment] === undefined) {
//     //         return undefined
//     //     }
//     //     currentAttributes = currentAttributes.props[segment]
//     // }
//     // return currentAttributes[key]
// }
