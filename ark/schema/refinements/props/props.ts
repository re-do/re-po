import { throwParseError } from "@arktype/util"
import { BaseNode } from "../../base.js"
import type { CompilationContext } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import {
	parseOpen,
	type PropKind,
	type TraversableNode
} from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../traversal/context.js"
import { BasePrimitiveRefinement, type FoldInput } from "../refinement.js"
import type { IndexNode, IndexSchema } from "./index.js"
import type { OptionalNode, OptionalSchema } from "./optional.js"
import type { RequiredNode, RequiredSchema } from "./required.js"
import type { SequenceNode, SequenceSchema } from "./sequence.js"

export type KeyCheckKind = "loose" | "strict" | "prune"

export type KeyRestrictionKind = "strict" | "prune"

export interface PropsInner extends BaseMeta {
	readonly keys?: KeyRestrictionKind
	readonly required?: readonly RequiredNode[]
	readonly optional?: readonly OptionalNode[]
	readonly index?: readonly IndexNode[]
	readonly sequence?: SequenceNode
}

export interface PropsSchema extends BaseMeta {
	readonly keys?: KeyCheckKind
	readonly required?: readonly RequiredSchema[]
	readonly optional?: readonly OptionalSchema[]
	readonly index?: readonly IndexSchema[]
	readonly sequence?: SequenceSchema
}

export type PropsDeclaration = declareNode<{
	kind: "props"
	schema: PropsSchema
	normalizedSchema: PropsSchema
	inner: PropsInner
	composition: "composite"
	prerequisite: object
	childKind: PropKind
}>

export class PropsNode
	extends BaseNode<object, PropsDeclaration, typeof PropsNode>
	implements TraversableNode<object>
{
	static implementation = this.implement({
		keys: {
			keys: {
				parse: (def, ctx) => (def === "loose" ? undefined : def)
			},
			optional: {
				child: true,
				parse: (def, ctx) => parseOpen("optional", def, ctx)
			},
			required: {
				child: true,
				parse: (def, ctx) => parseOpen("required", def, ctx)
			},
			index: {
				child: true,
				parse: (def, ctx) => parseOpen("index", def, ctx)
			},
			sequence: {
				child: true,
				parse: (def, ctx) => ctx.$.parseNode("sequence", def, ctx)
			}
		},
		normalize: (schema) => schema,
		hasAssociatedError: true,
		defaults: {
			description(inner) {
				return ""
			}
		}
	})

	readonly hasOpenIntersection = false
	traverseAllows: TraverseAllows<object> = () => true
	traverseApply: TraverseApply<object> = () => {}

	compileAllows(ctx: CompilationContext) {
		return ""
	}

	compileApply(ctx: CompilationContext) {
		return ""
	}

	intersectOwnInner(r: PropsNode) {
		return this
	}

	foldIntersection(into: FoldInput<"props">) {
		if (into.basis?.domain !== "object") {
			throwParseError("")
		}
		into.props = this.intersectOwnKind(into.props)
		return into
	}
}
