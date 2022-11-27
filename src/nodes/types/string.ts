import type { mutable, xor } from "../../utils/generics.js"
import type { Bounds } from "../bounds.js"
import { checkBounds, intersectBounds } from "../bounds.js"
import type { IntersectFn, PruneFn } from "../node.js"
import { isNever } from "./degenerate.js"
import { intersectAdditiveValues } from "./utils.js"

export type StringAttributes = xor<
    {
        readonly regex?: readonly string[]
        readonly bounds?: Bounds
    },
    { readonly literals?: readonly string[] }
>

export const intersectStrings: IntersectFn<StringAttributes> = (l, r) => {
    if (l.literals || r.literals) {
        const literals = l.literals ?? r.literals!
        const attributes = l.literals ? r : l
        const result: string[] = literals.filter((value) =>
            checkString(value, attributes)
        )
        return result.length
            ? { literals: result }
            : // TODO: Abstract never types
              {
                  never: `none of ${JSON.stringify(
                      literals
                  )} satisfy ${JSON.stringify(attributes)}`
              }
    }
    const result = { ...l, ...r } as mutable<StringAttributes>
    if (l.regex && r.regex) {
        result.regex = intersectAdditiveValues(l.regex, r.regex)
    }
    if (l.bounds && r.bounds) {
        const bounds = intersectBounds(l.bounds, r.bounds)
        if (isNever(bounds)) {
            return bounds
        }
        result.bounds = bounds
    }
    return result
}

export const pruneString: PruneFn<StringAttributes> = (branch, given) => {
    return branch
}

const regexCache: Record<string, RegExp> = {}

export const checkString = (data: string, attributes: StringAttributes) => {
    if (attributes.literals) {
        return attributes.literals.includes(data)
    }
    if (attributes.bounds && !checkBounds(attributes.bounds, data.length)) {
        return false
    }
    if (attributes.regex) {
        for (const source of attributes.regex) {
            if (!regexCache[source]) {
                regexCache[source] = new RegExp(source)
            }
            if (!regexCache[source].test(data)) {
                return false
            }
        }
    }
    return true
}
