import type { array, dict } from "./typeOf.js"
import { hasType } from "./typeOf.js"

export type narrow<t> = castWithExclusion<t, narrowRecurse<t>, []>

type narrowRecurse<t> = {
    [k in keyof t]: t[k] extends Narrowable | [] ? t[k] : narrowRecurse<t[k]>
}

type castWithExclusion<t, castTo, excluded> = t extends excluded ? t : castTo

type Narrowable = string | boolean | number | bigint

/**
 * Note: Similarly to Narrow, trying to Evaluate 'unknown'
 * directly (i.e. not nested in an object) leads to the type '{}',
 * but I'm unsure how to fix this without breaking the types that rely on it.
 *
 */
export type evaluate<t> = {
    [k in keyof t]: t[k]
} & unknown

// Currently returns never if string and number keys of the same name are merged, e.g.:
// type Result = Merge<{1: false}, {"1": true}> //never
// This feels too niche to fix at the cost of performance and complexity, but that could change.
// It also overrides values with undefined, unlike the associated function. We'll have to see if this is problematic.
export type merge<base, merged> = evaluate<
    Omit<extractMergeable<base>, Extract<keyof base, keyof merged>> &
        extractMergeable<merged>
>

type extractMergeable<t> = t extends {} ? t : {}

export type isTopType<t> = (any extends t ? true : false) extends true
    ? true
    : false

export type isAny<t> = (any extends t ? topTypeIsAny<t> : false) extends true
    ? true
    : false

export type isUnknown<t> = (
    any extends t ? topTypeIsUnknown<t> : false
) extends true
    ? true
    : false

type topTypeIsAny<t> = (t extends {} ? true : false) extends false
    ? false
    : true

type topTypeIsUnknown<t> = (t extends {} ? true : false) extends false
    ? true
    : false

export type conform<t, base> = t extends base ? t : base

export const isKeyOf = <k extends string | number, obj extends object>(
    k: k,
    obj: obj
): k is Extract<keyof obj, k> => k in obj

export type entryOf<o> = { [k in keyof o]: [k, o[k]] }[o extends unknown[]
    ? keyof o & number
    : keyof o]

export type entriesOf<o extends object> = entryOf<o>[]

export const entriesOf = <o extends object>(o: o) =>
    Object.entries(o) as entriesOf<o>

export type keysOf<o extends object> = (keyof o)[]

export const keysOf = <o extends object>(o: o) => Object.keys(o) as keysOf<o>

export const hasKey = <o, k extends string>(
    o: o,
    k: k
): o is Extract<o, { [_ in k]: {} }> => {
    const valueAtKey = (o as any)?.[k]
    return valueAtKey !== undefined && valueAtKey !== null
}

export type keySet<key extends string = string> = { readonly [_ in key]?: true }

export const hasKeys = (value: unknown) =>
    hasType(value, "object") ? Object.keys(value).length !== 0 : false

export type mutable<o> = {
    -readonly [k in keyof o]: o[k]
}

export type immutable<o> = {
    readonly [k in keyof o]: o[k]
}

export type deepImmutable<o> = {
    readonly [k in keyof o]: o[k] extends object ? deepImmutable<o[k]> : o[k]
}

export type subtype<t, u extends t> = u

export type defined<t> = Exclude<t, undefined>

export type requireKeys<o, key extends keyof o> = o & {
    [requiredKey in key]-?: o[requiredKey]
}

export type maybePush<MaybeArray, T> = MaybeArray extends unknown[]
    ? [...MaybeArray, T]
    : T

export type partialRecord<k extends string, v> = { [_ in k]?: v }

export type error<message extends string = string> = `!${message}`

export type stringKeyOf<t> = keyof t & string

export type RegexLiteral<expression extends string = string> = `/${expression}/`

/** Either:
 * A, with all properties of B as undefined
 * OR
 * B, with all properties of A as undefined
 **/
export type xor<a, b> =
    | evaluate<a & { [k in keyof b]?: undefined }>
    | evaluate<b & { [k in keyof a]?: undefined }>

/**
 * xoring objects can result in a type that can be assigned a value directly but
 * never satisfied as an input to a function due to the way TS handles parameter
 * contravariance. Applying this to an object union will allow all values that
 * are valid in any of the xor'ed branches, loosening the type enough for it to
 * be used as function input.
 */
export type propwiseUnion<objectUnion extends object> = evaluate<{
    [k in stringKeyOf<objectUnion>]: objectUnion[k]
}>

export const listFrom = <t>(data: t) =>
    (Array.isArray(data) ? data : [data]) as t extends array ? t : [t]
