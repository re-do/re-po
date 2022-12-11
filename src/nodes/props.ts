import type { ScopeRoot } from "../scope.js"
import type { Dictionary, keySet, mutable } from "../utils/generics.js"
import { hasKeys, keyCount } from "../utils/generics.js"
import { tryParseWellFormedNumber } from "../utils/numericLiterals.js"
import type { ObjectSubtypeName } from "../utils/typeOf.js"
import { hasObjectSubtype } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import { checkNode } from "./check.js"
import type { ConstraintContext } from "./compare.js"
import {
    composeConstraintIntersection,
    composeKeyedOperation,
    equivalence
} from "./compose.js"
import { nodeIntersection } from "./intersection.js"
import type { UnknownNode, TypeNode, Resolution } from "./node.js"

type PropTypesAttribute = {
    readonly number?: TypeNode
    readonly string?: TypeNode
}

export type ObjectAttributes = {
    readonly type: "object"
    readonly props?: Dictionary<TypeNode>
    readonly requiredKeys?: keySet
    readonly propTypes?: PropTypesAttribute
    readonly subtype?: ObjectSubtypeName
    readonly bounds?: Bounds
}

type BaseProps = Dictionary<UnknownNode>

// TODO: Never propagation
export const propsIntersection = composeConstraintIntersection<
    BaseProps,
    ConstraintContext
>(
    composeKeyedOperation<Dictionary<UnknownNode>, ConstraintContext>(
        (propKey, l, r, context) => nodeIntersection(l, r, context.scope),
        { propagateEmpty: true }
    )
)

export const requiredKeysIntersection = composeConstraintIntersection<keySet>(
    (l, r) => {
        const result = { ...l, ...r }
        const resultSize = keyCount(result)
        return resultSize === keyCount(l)
            ? resultSize === keyCount(r)
                ? equivalence
                : l
            : resultSize === keyCount(r)
            ? r
            : result
    }
)

export const checkObject = (
    data: object,
    attributes: ObjectAttributes,
    scope: ScopeRoot
) => {
    if (hasObjectSubtype(data, "Array") && isSimpleArray(attributes)) {
        return data.every((elementData) =>
            checkNode(elementData, attributes.propTypes.number, scope)
        )
    }
    const missingKeys: mutable<keySet> = { ...attributes.requiredKeys }
    for (const k in data) {
        const propValue = (data as Dictionary)[k]
        if (
            attributes.props?.[k] &&
            !checkNode(propValue, attributes.props[k], scope)
        ) {
            return false
        }
        if (attributes.propTypes) {
            const keyIsNumber = tryParseWellFormedNumber(k) !== undefined
            if (
                keyIsNumber &&
                attributes.propTypes.number &&
                !checkNode(propValue, attributes.propTypes.number, scope)
            ) {
                return false
            } else if (
                attributes.propTypes.string &&
                !checkNode(propValue, attributes.propTypes.string, scope)
            ) {
                return false
            }
        }
        delete missingKeys[k]
    }
    return hasKeys(missingKeys) ? false : true
}

const isSimpleArray = (
    attributes: ObjectAttributes
): attributes is { type: "object"; propTypes: { number: Resolution } } =>
    !attributes.props &&
    attributes.propTypes?.number !== undefined &&
    Object.keys(attributes.propTypes).length === 1
