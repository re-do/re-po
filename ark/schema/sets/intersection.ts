import type {
	conform,
	ErrorMessage,
	exactMessageOnError,
	mutable
} from "@arktype/util"
import {
	includes,
	isArray,
	throwInternalError,
	throwParseError
} from "@arktype/util"
import {
	type BaseAttributes,
	BaseNode,
	constraintKinds,
	type declareNode,
	type withAttributes
} from "../base.js"
import { type BasisKind, maybeParseBasis, parseBasis } from "../bases/basis.js"
import {
	type constraintInputsByKind,
	type ConstraintKind,
	parseConstraint
} from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import {
	type DiscriminableSchema,
	type Node,
	type RuleKind,
	type Schema
} from "../nodes.js"
import { BaseRoot, type Root } from "../root.js"
import { type ParseContext } from "../utils.js"

export type IntersectionInner = withAttributes<{
	readonly intersection: CollapsedIntersectionInner
}>

export type CollapsedIntersectionInner =
	| readonly [Node<BasisKind>, ...Node<ConstraintKind>[]]
	| readonly Node<ConstraintKind>[]

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	schema: IntersectionSchema
	inner: IntersectionInner
	intersections: {
		intersection: "intersection" | Disjoint
		default: "intersection" | Disjoint
	}
	reductions: "intersection" | BasisKind
}>

export class IntersectionNode<t = unknown> extends BaseRoot<
	IntersectionDeclaration,
	t
> {
	static readonly kind = "intersection"
	static readonly declaration: IntersectionDeclaration
	readonly basis: Root<unknown, BasisKind> | undefined =
		this.intersection[0]?.isBasis() ? this.intersection[0] : undefined
	readonly constraints: readonly Node<ConstraintKind>[] = this.basis
		? this.intersection.slice(1)
		: (this.intersection as any)

	static readonly definition = this.define({
		kind: "intersection",
		keys: {
			intersection: {
				children: (constraints) => constraints
			}
		},
		intersections: {
			intersection: (l, r) => {
				let result: CollapsedIntersectionInner | Disjoint = l.intersection
				for (const constraint of r.constraints) {
					if (result instanceof Disjoint) {
						break
					}
					result = intersectRule(result, constraint)
				}
				return result instanceof Disjoint
					? result
					: new IntersectionNode({ intersection: result })
			},
			default: (l, r) => {
				const result = intersectRule(l.intersection, r)
				return result instanceof Disjoint
					? result
					: new IntersectionNode({ intersection: result })
			}
		},
		parseSchema: (schema) => {
			const { alias, description, ...rules } = schema
			const intersectionInner = {} as mutable<IntersectionInner>
			if (alias) {
				intersectionInner.alias = alias
			}
			if (description) {
				intersectionInner.description = description
			}
			intersectionInner.intersection =
				"intersection" in rules
					? parseListedRules(rules.intersection)
					: parseMappedRules(rules)
			return intersectionInner
		},
		reduceToNode: (inner) => {
			if (inner.intersection.length === 1 && inner.intersection[0].isBasis()) {
				// TODO: collapse description?
				return inner.intersection[0]
			}
			return new IntersectionNode(inner)
		},
		compileCondition: (inner) => {
			let condition = inner.intersection
				.map((rule) => rule.condition)
				.join(") && (")
			if (inner.intersection.length > 1) {
				condition = `(${condition})`
			}
			return condition || "true"
		},
		writeDefaultDescription: (inner) => {
			return inner.intersection.length === 0
				? "a value"
				: inner.intersection.join(" and ")
		}
	})
}

const parseListedRules = (
	schemas: RuleSchemaSet
): CollapsedIntersectionInner => {
	const basis = schemas[0] ? maybeParseBasis(schemas[0]) : undefined
	const rules: mutable<CollapsedIntersectionInner> = basis ? [basis] : []
	const constraintContext: ParseContext = { basis }
	for (let i = basis ? 1 : 0; i < schemas.length; i++) {
		rules.push(parseConstraint(schemas[i] as never, constraintContext))
	}
	return rules
}

const parseMappedRules = ({
	basis: basisSchema,
	...constraintSchemasByKind
}: MappedIntersectionSchema<any> & {
	// at this point each key should be "basis" or a constraint kind
	[k in keyof BaseAttributes]?: never
}): CollapsedIntersectionInner => {
	const basis = basisSchema ? parseBasis(basisSchema) : undefined
	const rules: mutable<CollapsedIntersectionInner> = basis ? [basis] : []
	const constraintContext: ParseContext = { basis }
	for (const k in constraintSchemasByKind) {
		if (!includes(constraintKinds, k)) {
			return throwParseError(`'${k}' is not a valid constraint kind`)
		}
		const schemas = constraintSchemasByKind[k]
		if (isArray(schemas)) {
			rules.push(
				...schemas.map((schema) =>
					BaseNode.classesByKind[k].parse(schema as never, constraintContext)
				)
			)
		} else {
			rules.push(
				BaseNode.classesByKind[k].parse(schemas as never, constraintContext)
			)
		}
	}
	return rules
}

const intersectRule = (
	base: readonly Node<RuleKind>[],
	rule: Node<RuleKind>
): CollapsedIntersectionInner | Disjoint => {
	const result: Node<RuleKind>[] = []
	let includesConstraint = false
	for (let i = 0; i < base.length; i++) {
		const elementResult = rule.intersect(base[i])
		if (elementResult === null) {
			result.push(base[i])
		} else if (elementResult instanceof Disjoint) {
			return elementResult
		} else if (!includesConstraint) {
			result.push(elementResult)
			includesConstraint = true
		} else if (!base.includes(elementResult)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for constraint ${elementResult}`
			)
		}
	}
	if (!includesConstraint) {
		result.push(rule)
	}
	return result
}

// const assertValidConstraints = (
// 	basis: Node<BasisKind> | undefined,
// 	constraints: readonly Node<ConstraintKind>[]
// ) => {
// 	for (const constraint of constraints) {
// 		if (
// 			!constraint.nodeClass.basis.isUnknown() &&
// 			(!basis || !basis.extends(constraint.nodeClass.basis))
// 		) {
// 			throwParseError(constraint.nodeClass.writeInvalidBasisMessage(basis))
// 		}
// 	}
// }

export type IntersectionBasis = {
	basis?: Schema<BasisKind>
}

export type MappedIntersectionSchema<
	basis extends Schema<BasisKind> | undefined = Schema<BasisKind> | undefined
> = {
	basis?: basis
} & constraintInputsByKind<
	basis extends Schema<BasisKind> ? parseBasis<basis>["infer"] : unknown
> &
	BaseAttributes

export type ListedIntersectionSchema = {
	intersection: RuleSchemaSet
} & BaseAttributes

export type RuleSchemaSet =
	| readonly [Schema<BasisKind>, ...DiscriminableSchema<RuleKind>[]]
	| readonly DiscriminableSchema<"predicate">[]

export type IntersectionSchema =
	| MappedIntersectionSchema
	| ListedIntersectionSchema

type exactBasisMessageOnError<branch, expected> = {
	[k in keyof branch]: k extends keyof expected
		? conform<branch[k], expected[k]>
		: ErrorMessage<`'${k & string}' is not allowed by ${branch[keyof branch &
				BasisKind] extends string
				? `basis '${branch[keyof branch & BasisKind]}'`
				: `this schema's basis`}`>
}

export type validateIntersectionSchema<schema> =
	schema extends ListedIntersectionSchema
		? exactMessageOnError<schema, ListedIntersectionSchema>
		: schema extends IntersectionBasis
		? exactBasisMessageOnError<
				schema,
				MappedIntersectionSchema<schema["basis"]>
		  >
		: IntersectionSchema

export type parseIntersectionSchema<schema> =
	schema extends ListedIntersectionSchema
		? schema["intersection"] extends readonly [
				infer basis extends Schema<BasisKind>,
				...infer constraints
		  ]
			? // if there are no constraint elements, reduce to the basis node
			  constraints extends []
				? parseBasis<basis>
				: IntersectionNode<parseBasis<basis>["infer"]>
			: IntersectionNode<unknown>
		: schema extends Required<IntersectionBasis>
		? keyof schema & ConstraintKind extends never
			? // if there are no constraint keys, reduce to the basis node
			  parseBasis<schema["basis"]>
			: IntersectionNode<parseBasis<schema["basis"]>["infer"]>
		: IntersectionNode<unknown>

// export class ArrayPredicate extends composePredicate(
// 	Narrowable<"object">,
// 	Instantiatable<typeof Array>,
// 	Boundable
// ) {
// 	// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// 	// to a single variadic number prop with minLength 1
// 	// Figure out best design for integrating with named props.

// 	readonly prefix?: readonly TypeRoot[]
// 	readonly variadic?: TypeRoot
// 	readonly postfix?: readonly TypeRoot[]
// }

// export class DatePredicate extends composePredicate(
// 	Narrowable<"object">,
// 	Instantiatable<typeof Date>,
// 	Boundable
// ) {}
