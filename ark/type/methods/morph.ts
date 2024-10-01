import type { inferPipe } from "../keywords/inference.ts"
import type { type } from "../keywords/keywords.ts"
import type { BaseType } from "./base.ts"

// t can't be constrained to MorphAst here because it could be a union including some
// non-morph branches
/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}> extends BaseType<t, $> {
	/**
	 * Append extra validation shape after this morph `Type`
	 * @example type("string").pipe(s => s.length as any).to("number") // Type<(In: string) => Out<number>>
	 */
	to<const def, r = type.infer<def, $>>(
		def: type.validate<def, $>
	): Type<inferPipe<t, r>, $>
}

export type { Type as MorphType }
