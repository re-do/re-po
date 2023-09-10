import { cached } from "@arktype/util"
import { TypeNode } from "./type.js"

const node = (...args: any[]) => new TypeNode({ branches: [] })

// // TODO: integrate with default scopes
export const builtins = {
	never: cached(() => new TypeNode<never>({ branches: [] })),
	unknown: cached(() => node()),
	// TODO: fix
	nonVariadicArrayIndex: cached(() => node("number")),
	arrayIndexTypeNode: cached(() => node("number")),
	string: cached(() => node("string")),
	array: cached(() => node(Array))
} satisfies Record<string, () => TypeNode>

// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608
// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred = Symbol("inferred")

export type CastTo<t> = {
	[inferred]?: t
}
