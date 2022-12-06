import type { array, dict } from "./typeOf.js"
import { hasType, rawObjectSubtypeOf, subtypeOf } from "./typeOf.js"

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
    const aSubtype = subtypeOf(a)
    const bSubtype = subtypeOf(b)
    if (aSubtype !== bSubtype) {
        return false
    }
    return aSubtype === "dict"
        ? deepEqualsDict(a as dict, b as dict)
        : aSubtype === "array"
        ? deepEqualsArray(a as array, b as array)
        : a === b
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
