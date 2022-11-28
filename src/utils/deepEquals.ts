import type { array, dict } from "./typeOf.js"
import { hasType, objectSubtypeOf } from "./typeOf.js"

/**
 * Simple check for deep strict equality. Recurses into dictionaries and arrays,
 * shallowly tests === for any other value. Does not handle cyclic data.
 */
export const deepEquals = (a: unknown, b: unknown) => {
    if (a === b) {
        return true
    }
    if (!hasType(a, "object") || !hasType(b, "object")) {
        return false
    }
    const aSubtype = objectSubtypeOf(a)
    const bSubtype = objectSubtypeOf(b)
    if (aSubtype !== bSubtype) {
        return false
    }
    return aSubtype === "array"
        ? deepEqualsArray(a as any, b as any)
        : deepEqualsDict(a, b)
}

const deepEqualsDict = (a: dict, b: dict) => {
    const unseenBKeys = { ...b }
    for (const k in a) {
        if (k in b && deepEquals(a[k], b[k])) {
            delete unseenBKeys[k]
        } else {
            return false
        }
    }
    if (Object.keys(unseenBKeys).length) {
        return false
    }
    return true
}

const deepEqualsArray = (a: array, b: array) => {
    if (a.length !== b.length) {
        return false
    }
    for (let i = 0; i < a.length; i++) {
        if (!deepEquals(a[i], b[i])) {
            return false
        }
    }
    return true
}

export const isEmpty = (o: array | dict) => Object.keys(o).length === 0
