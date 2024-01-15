import type { ErrorMessage } from "./errors.js"
import type { unionToTuple } from "./unionToTuple.js"

export type Stringifiable =
	| string
	| boolean
	| number
	| bigint
	| null
	| undefined

/**
 * Force an operation like `{ a: 0 } & { b: 1 }` to be computed so that it displays `{ a: 0; b: 1 }`.
 *
 * Also works for some non-intersections, e.g. `keyof SomeObj` => `"a" | "b" | ...`
 */
export type evaluate<t> = { [k in keyof t]: t[k] } & unknown

export type exact<t extends object, u extends object> = {
	[k in keyof t]: k extends keyof u ? conform<t[k], u[k]> : never
}

export type exactMessageOnError<t extends object, u extends object> = {
	[k in keyof t]: k extends keyof u
		? conform<t[k], u[k]>
		: ErrorMessage<`'${k & string}' is not a valid key`>
}

export type defer<t> = [t][t extends any ? 0 : never]

export type merge<base, merged> = {
	[k in Exclude<keyof base, keyof merged>]: base[k]
} & merged &
	unknown

/**
 * Interesection (`&`) that avoids evaluating `unknown` to `{}`
 */
export type andPreserveUnknown<l, r> = unknown extends l & r
	? unknown
	: evaluate<l & r>

export type isAny<t> = [unknown, t] extends [t, {}] ? true : false

export type isNever<t> = [t] extends [never] ? true : false

export type isUnknown<t> = unknown extends t
	? [t] extends [{}]
		? false
		: true
	: false

export type conform<t, base> = t extends base ? t : base

export type equals<t, u> = (<_>() => _ extends t ? 1 : 2) extends <
	_
>() => _ extends u ? 1 : 2
	? true
	: false

export const id = Symbol("id")

export type id = typeof id

export type nominal<t, id extends string> = t & {
	readonly [id]: id
}

export type satisfy<t, u extends { [k in keyof t]: t[k] }> = u

export type extend<t, u> = evaluate<t & u>

export type defined<t> = t & ({} | null)

export type autocomplete<suggestions extends string> =
	| suggestions
	| (string & {})

export type widen<t, supertypes> = collectWidenedType<
	t,
	unionToTuple<supertypes>
>

type collectWidenedType<
	t,
	remaining extends unknown[],
	result = never
> = remaining extends [infer head, ...infer tail]
	? collectWidenedType<t, tail, t extends head ? result | head : result>
	: result
