import {
	append,
	appendUnique,
	conflatenateAll,
	entriesOf,
	isArray,
	isEmptyObject,
	omit,
	pick,
	splitByKeys,
	throwInternalError,
	type array,
	type evaluate,
	type listable
} from "@arktype/util"
import {
	BaseNode,
	type ConstraintNode,
	type Node,
	type SchemaNode
} from "../base.js"
import {
	PropsGroup,
	type ExtraneousKeyBehavior,
	type ExtraneousKeyRestriction
} from "../constraints/props/props.js"
import { tsKeywords } from "../keywords/tsKeywords.js"
import type { Inner, MutableInner, NodeDef, Prerequisite } from "../kinds.js"
import { node, type SchemaParseContext } from "../parser/parse.js"
import type { BaseScope } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import { metaKeys, type BaseMeta, type declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkTypeError } from "../shared/errors.js"
import {
	constraintKeys,
	propKeys,
	type ConstraintKind,
	type IntersectionChildKind,
	type OpenNodeKind,
	type PropKind,
	type RefinementKind,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import type { DomainDef, DomainNode } from "./domain.js"
import type { ProtoDef, ProtoNode } from "./proto.js"
import { BaseSchema, defineRightwardIntersections } from "./schema.js"

export type IntersectionBasisKind = "domain" | "proto"

export type IntersectionInner = evaluate<
	BaseMeta & {
		domain?: DomainNode
		proto?: ProtoNode
	} & {
		[k in ConditionalIntersectionKey]?: conditionalInnerValueOfKey<k>
	}
>

export type IntersectionDef<inferredBasis = any> = evaluate<
	BaseMeta & {
		domain?: DomainDef
		proto?: ProtoDef
	} & conditionalSchemaOf<inferredBasis>
>

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	def: IntersectionDef
	normalizedDef: IntersectionDef
	inner: IntersectionInner
	reducibleTo: "intersection" | IntersectionBasisKind
	errorContext: {
		errors: readonly ArkTypeError[]
	}
	childKind: IntersectionChildKind
}>

const intersectionChildKeyParser =
	<kind extends IntersectionChildKind>(kind: kind) =>
	(
		def: listable<NodeDef<kind>>,
		ctx: SchemaParseContext
	): intersectionChildInnerValueOf<kind> | undefined => {
		if (isArray(def)) {
			if (def.length === 0) {
				// Omit empty lists as input
				return
			}
			return def
				.map((schema) => node(kind, schema as never))
				.sort((l, r) => (l.innerId < r.innerId ? -1 : 1)) as never
		}
		const child = node(kind, def)
		return child.intersectionIsOpen ? [child] : (child as any)
	}

const intersectIntersections = (
	reduced: IntersectionInner,
	raw: IntersectionInner
): SchemaNode | Disjoint => {
	// avoid treating adding instance keys as keys of lRoot, rRoot
	if (reduced instanceof IntersectionNode) reduced = reduced.inner
	if (raw instanceof IntersectionNode) raw = raw.inner

	const [reducedConstraintsInner, reducedRoot] = splitByKeys(
		reduced,
		constraintKeys
	)
	const [rawConstraintsInner, rawRoot] = splitByKeys(raw, constraintKeys)

	// since intersection with a left operand of unknown is leveraged for
	// reduction, check for the case where r is empty so we can preserve
	// metadata and save some time

	const root = isEmptyObject(reduced)
		? rawRoot
		: intersectRootKeys(reducedRoot, rawRoot)

	if (root instanceof Disjoint) return root

	const lConstraints = flattenConstraints(reducedConstraintsInner)
	const rConstraints = flattenConstraints(rawConstraintsInner)

	return intersectConstraints({
		root,
		l: lConstraints,
		r: rConstraints,
		types: []
	})
}

export class IntersectionNode<t = unknown, $ = any> extends BaseSchema<
	t,
	$,
	IntersectionDeclaration
> {
	static implementation: nodeImplementationOf<IntersectionDeclaration> =
		this.implement({
			kind: "intersection",
			hasAssociatedError: true,
			normalize: (schema) => schema,
			keys: {
				domain: {
					child: true,
					parse: intersectionChildKeyParser("domain")
				},
				proto: {
					child: true,
					parse: intersectionChildKeyParser("proto")
				},
				divisor: {
					child: true,
					parse: intersectionChildKeyParser("divisor")
				},
				max: {
					child: true,
					parse: intersectionChildKeyParser("max")
				},
				min: {
					child: true,
					parse: intersectionChildKeyParser("min")
				},
				maxLength: {
					child: true,
					parse: intersectionChildKeyParser("maxLength")
				},
				minLength: {
					child: true,
					parse: intersectionChildKeyParser("minLength")
				},
				exactLength: {
					child: true,
					parse: intersectionChildKeyParser("exactLength")
				},
				before: {
					child: true,
					parse: intersectionChildKeyParser("before")
				},
				after: {
					child: true,
					parse: intersectionChildKeyParser("after")
				},
				regex: {
					child: true,
					parse: intersectionChildKeyParser("regex")
				},
				predicate: {
					child: true,
					parse: intersectionChildKeyParser("predicate")
				},
				prop: {
					child: true,
					parse: intersectionChildKeyParser("prop")
				},
				index: {
					child: true,
					parse: intersectionChildKeyParser("index")
				},
				sequence: {
					child: true,
					parse: intersectionChildKeyParser("sequence")
				},
				onExtraneousKey: {
					parse: (def) => (def === "ignore" ? undefined : def)
				}
			},
			// leverage reduction logic from intersection and identity to ensure initial
			// parse result is reduced
			reduce: (inner) =>
				// we cast union out of the result here since that only occurs when intersecting two sequences
				// that cannot occur when reducing a single intersection schema using unknown
				intersectIntersections({}, inner) as Node<
					"intersection" | IntersectionBasisKind
				>,
			defaults: {
				description(node) {
					return node.children.length === 0
						? "unknown"
						: node.props?.description ??
								node.children.map((child) => child.description).join(" and ")
				},
				expected(source) {
					return "  • " + source.errors.map((e) => e.expected).join("\n  • ")
				},
				problem(ctx) {
					return `must be...\n${ctx.expected}`
				}
			},
			intersections: {
				intersection: intersectIntersections,
				...defineRightwardIntersections("intersection", (l, r) => {
					// if l is unknown, return r
					if (l.children.length === 0) return r

					const basis = l.basis?.intersect(r) ?? r

					return basis instanceof Disjoint
						? basis
						: l?.basis?.equals(basis)
						? // if the basis doesn't change, return the original intesection
						  l
						: // given we've already precluded l being unknown, the result must
						  // be an intersection with the new basis result integrated
						  node(
								"intersection",
								Object.assign(omit(l.inner, metaKeys), { [basis.kind]: basis }),
								{ prereduced: true }
						  )
				})
			}
		})

	readonly basis = this.domain ?? this.proto
	readonly refinements = this.children.filter(
		(node): node is Node<RefinementKind> => node.isRefinement()
	)
	readonly props = maybeCreatePropsGroup(this.inner, this.$)
	readonly traversables = conflatenateAll<
		Node<Exclude<IntersectionChildKind, PropKind>> | PropsGroup
	>(this.basis, this.refinements, this.props, this.predicate)
	readonly expression =
		this.props?.expression ||
		this.children.map((node) => node.nestableExpression).join(" & ") ||
		"unknown"

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.traversables.every((traversable) =>
			traversable.traverseAllows(data as never, ctx)
		)

	traverseApply: TraverseApply = (data, ctx) => {
		if (this.basis) {
			this.basis.traverseApply(data, ctx)
			if (ctx.hasError()) return
		}
		if (this.refinements.length) {
			for (let i = 0; i < this.refinements.length - 1; i++) {
				this.refinements[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.hasError()) return
			}
			this.refinements.at(-1)!.traverseApply(data as never, ctx)
			if (ctx.hasError()) return
		}
		if (this.props) {
			this.props.traverseApply(data as never, ctx)
			if (ctx.hasError()) return
		}
		if (this.predicate) {
			for (let i = 0; i < this.predicate.length - 1; i++) {
				this.predicate[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.hasError()) return
			}
			this.predicate.at(-1)!.traverseApply(data as never, ctx)
		}
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			this.traversables.forEach((traversable) =>
				traversable instanceof BaseNode
					? js.check(traversable)
					: traversable.compile(js)
			)
			js.return(true)
			return
		}

		const returnIfFail = () => js.if("ctx.hasError()", () => js.return())
		const returnIfFailFast = () =>
			js.if("ctx.failFast && ctx.hasError()", () => js.return())

		if (this.basis) {
			js.check(this.basis)
			// we only have to return conditionally if this is not the last check
			if (this.traversables.length > 1) returnIfFail()
		}
		if (this.refinements.length) {
			for (let i = 0; i < this.refinements.length - 1; i++) {
				js.check(this.refinements[i])
				returnIfFailFast()
			}
			js.check(this.refinements.at(-1)!)
			if (this.props || this.predicate) returnIfFail()
		}
		if (this.props) {
			this.props.compile(js)
			if (this.predicate) returnIfFail()
		}
		if (this.predicate) {
			for (let i = 0; i < this.predicate.length - 1; i++) {
				js.check(this.predicate[i])
				// since predicates can be chained, we have to fail immediately
				// if one fails
				returnIfFail()
			}
			js.check(this.predicate.at(-1)!)
		}
	}

	rawKeyOf(): SchemaNode {
		return this.basis
			? this.props
				? this.basis.rawKeyOf().or(this.props.rawKeyOf())
				: this.basis.rawKeyOf()
			: this.props?.rawKeyOf() ?? (tsKeywords.never as {} as SchemaNode)
	}
}

const maybeCreatePropsGroup = (inner: IntersectionInner, $: BaseScope) => {
	const propsInput = pick(inner, propKeys)
	return isEmptyObject(propsInput) ? undefined : new PropsGroup(propsInput, $)
}

type IntersectionRoot = Omit<IntersectionInner, ConstraintKind>

const intersectRootKeys = (
	l: IntersectionRoot,
	r: IntersectionRoot
): MutableInner<"intersection"> | Disjoint => {
	const result: IntersectionRoot = {}

	const lBasis = l.proto ?? l.domain
	const rBasis = r.proto ?? r.domain
	const resultBasis = lBasis
		? rBasis
			? lBasis.intersect(rBasis)
			: lBasis
		: rBasis
	if (resultBasis) {
		if (resultBasis instanceof Disjoint) {
			return resultBasis
		}
		if (resultBasis.kind === "domain" || resultBasis.kind === "proto") {
			result[resultBasis.kind] = resultBasis as never
		} else {
			return throwInternalError(
				`Unexpected intersection basis intersection ${resultBasis}`
			)
		}
	}
	if (l.onExtraneousKey || r.onExtraneousKey) {
		result.onExtraneousKey =
			l.onExtraneousKey === "throw" || r.onExtraneousKey === "throw"
				? "throw"
				: "prune"
	}
	return result
}

type ConstraintIntersectionState = {
	root: IntersectionRoot
	l: ConstraintNode[]
	r: ConstraintNode[]
	types: SchemaNode[]
}

const intersectConstraints = (
	s: ConstraintIntersectionState
): SchemaNode | Disjoint => {
	if (!s.r.length) {
		let result: SchemaNode | Disjoint = node(
			"intersection",
			Object.assign(s.root, unflattenConstraints(s.l)),
			{ prereduced: true }
		)
		for (const type of s.types) {
			if (result instanceof Disjoint) {
				return result
			}
			result = type.intersect(result)
		}
		return result
	}
	const head = s.r.shift()!
	let matched = false
	for (let i = 0; i < s.l.length; i++) {
		const result = s.l[i].intersect(head)
		if (result === null) continue
		if (result instanceof Disjoint) return result

		if (!matched) {
			if (result.isType()) s.types.push(result)
			else s.l[i] = result
			matched = true
		} else if (!s.l.includes(result as never)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for refinement ${result}`
			)
		}
	}
	if (!matched) {
		s.l.push(head)
	}

	head.impliedSiblings?.forEach((node) => appendUnique(s.r, node))
	return intersectConstraints(s)
}

const flattenConstraints = (inner: IntersectionInner): ConstraintNode[] => {
	const result = entriesOf(inner)
		.flatMap(([k, v]) =>
			k in constraintKeys ? (v as listable<ConstraintNode>) : []
		)
		.sort((l, r) =>
			l.precedence < r.precedence
				? -1
				: l.precedence > r.precedence
				? 1
				: l.innerId < r.innerId
				? -1
				: 1
		)

	return result
}

const unflattenConstraints = (
	constraints: array<ConstraintNode>
): IntersectionInner => {
	const inner: MutableInner<"intersection"> = {}
	for (const constraint of constraints) {
		if (constraint.intersectionIsOpen) {
			inner[constraint.kind] = append(
				inner[constraint.kind],
				constraint
			) as never
		} else {
			if (inner[constraint.kind]) {
				return throwInternalError(
					`Unexpected intersection of closed refinements of kind ${constraint.kind}`
				)
			}
			inner[constraint.kind] = constraint as never
		}
	}
	return inner
}

export type ConditionalTerminalIntersectionSchema = {
	onExtraneousKey?: ExtraneousKeyBehavior
}

export type ConditionalTerminalIntersectionInner = {
	onExtraneousKey?: ExtraneousKeyRestriction
}

type ConditionalTerminalIntersectionKey =
	keyof ConditionalTerminalIntersectionInner

type ConditionalIntersectionKey =
	| ConstraintKind
	| keyof ConditionalTerminalIntersectionInner

export type constraintKindOf<t> = {
	[k in ConstraintKind]: t extends Prerequisite<k> ? k : never
}[ConstraintKind]

type conditionalIntersectionKeyOf<t> =
	| constraintKindOf<t>
	| (t extends object ? "onExtraneousKey" : never)

// not sure why explicitly allowing Inner<k> is necessary in these cases,
// but remove if it can be removed without creating type errors
type intersectionChildSchemaValueOf<k extends IntersectionChildKind> =
	k extends OpenNodeKind
		? listable<NodeDef<k> | Inner<k>>
		: NodeDef<k> | Inner<k>

type conditionalSchemaValueOfKey<k extends ConditionalIntersectionKey> =
	k extends IntersectionChildKind
		? intersectionChildSchemaValueOf<k>
		: ConditionalTerminalIntersectionSchema[k &
				ConditionalTerminalIntersectionKey]

type intersectionChildInnerValueOf<k extends IntersectionChildKind> =
	k extends OpenNodeKind ? readonly Node<k>[] : Node<k>

type conditionalInnerValueOfKey<k extends ConditionalIntersectionKey> =
	k extends IntersectionChildKind
		? intersectionChildInnerValueOf<k>
		: ConditionalTerminalIntersectionInner[k &
				ConditionalTerminalIntersectionKey]

export type conditionalSchemaOf<t> = {
	[k in conditionalIntersectionKeyOf<t>]?: conditionalSchemaValueOfKey<k>
}
