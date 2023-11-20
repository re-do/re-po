import type { extend, listable } from "@arktype/util"
import type { BasisKind } from "../bases/basis.js"
import type { ConstraintKind, OpenConstraintKind } from "../shared/define.js"
import type { Node, Schema } from "../shared/node.js"
import type { RuleAttachments } from "../shared/rule.js"
import {
	MaxImplementation,
	MinImplementation,
	type MaxDeclaration,
	type MinDeclaration
} from "./bounds.js"
import { DivisorImplementation, type DivisorDeclaration } from "./divisor.js"
import { PatternImplementation, type PatternDeclaration } from "./pattern.js"
import {
	PredicateImplementation,
	type PredicateDeclaration
} from "./predicate.js"
import { PropImplementations, type PropDeclarations } from "./props/prop.js"

export type ClosedConstraintDeclarations = {
	divisor: DivisorDeclaration
	min: MinDeclaration
	max: MaxDeclaration
}

export type OpenConstraintDeclarations = extend<
	PropDeclarations,
	{
		pattern: PatternDeclaration
		predicate: PredicateDeclaration
	}
>

export type ConstraintDeclarations = extend<
	ClosedConstraintDeclarations,
	OpenConstraintDeclarations
>

export const ConstraintImplementations = {
	divisor: DivisorImplementation,
	min: MinImplementation,
	max: MaxImplementation,
	pattern: PatternImplementation,
	predicate: PredicateImplementation,
	...PropImplementations
} as const satisfies Record<ConstraintKind, unknown>

export type ConstraintAttachments<implicitBasisType> = extend<
	RuleAttachments,
	{
		readonly implicitBasis: Node<BasisKind, implicitBasisType> | undefined
	}
>

export type ConstraintIntersectionInputsByKind = {
	[k in ConstraintKind]: k extends OpenConstraintKind
		? listable<Schema<k>>
		: Schema<k>
}

export type ConstraintIntersectionInput<
	kind extends ConstraintKind = ConstraintKind
> = ConstraintIntersectionInputsByKind[kind]

export type constraintKindOf<t> = {
	[k in ConstraintKind]: Node<k> extends {
		implicitBasis: infer basis
	}
		? basis extends Node<BasisKind>
			? t extends basis["infer"]
				? k
				: never
			: basis extends undefined
			  ? k
			  : never
		: never
}[ConstraintKind]

export type constraintInputsByKind<t> = {
	[k in constraintKindOf<t>]?: ConstraintIntersectionInput<k>
}
