import { JsObjects } from "./builtins/jsObjects.js"
import { Parsing } from "./builtins/parsing.js"
import { TsKeywords } from "./builtins/tsKeywords.js"
import { Validation } from "./builtins/validation.js"
import type { MatchParser } from "./match.js"
import { Scope, type Module, type ScopeParser } from "./scope.js"
import type { inferred } from "./shared/inference.js"
import type {
	DeclarationParser,
	DefinitionParser,
	Generic,
	TypeParser
} from "./type.js"

/** Root scopes can be inferred automatically from node definitions, but
 * explicitly typing them can improve responsiveness */
export type RootScope<exports> = Scope<{
	exports: exports
	locals: {}
	ambient: {}
}>

export type ArkResolutions = { exports: Ark; locals: {}; ambient: Ark }

// For some reason if we try to inline this, it gets evaluated and the module
// can't be inferred
export type ParsingResolutions = {
	exports: Parsing.infer
	locals: {}
	ambient: {}
}

export type TsGenericsResolutions<$ = Ark> = {
	exports: TsGenericsExports<$>
	locals: {}
	ambient: {}
}

type TsGenericsExports<$ = Ark> = {
	Record: Generic<
		["K", "V"],
		{
			"[K]": "V"
		},
		// as long as the generics in the root scope don't reference one
		// another, they shouldn't need a bound local scope
		$
	>
}

export const tsGenerics = {} as Module<TsGenericsResolutions>

export const ark: Scope<ArkResolutions> = Scope.root({
	...TsKeywords.resolutions,
	...JsObjects.resolutions,
	...Validation.resolutions,
	// TODO: fix
	...tsGenerics,
	parse: Parsing.resolutions as {} as Module<ParsingResolutions>
}).toAmbient() as never

export const arktypes: Module<ArkResolutions> = ark.export()

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends TsKeywords.infer,
		JsObjects.infer,
		Validation.infer,
		TsGenericsExports {
	parse: Module<ParsingResolutions>
}

export const scope: ScopeParser<{}, Ark> = ark.scope as never

export const type: TypeParser<Ark> = ark.type

// TODO: cast needed?
export const match: MatchParser<Ark> = ark.match as never

export namespace type {
	export type cast<to> = {
		[inferred]?: to
	}
}

export const define: DefinitionParser<Ark> = ark.define

export const declare: DeclarationParser<Ark> = ark.declare
