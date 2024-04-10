import {
	type array,
	capitalize,
	type describeExpression,
	throwParseError
} from "@arktype/util"
import { BaseNode, type Node } from "../base.js"
import type { Prerequisite } from "../kinds.js"
import type { BaseSchema } from "../schemas/schema.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type {
	ConstraintKind,
	PropKind,
	kindLeftOf
} from "../shared/implement.js"
import { arkKind } from "../shared/utils.js"

export type constraintKindLeftOf<kind extends ConstraintKind> = ConstraintKind &
	kindLeftOf<kind>

export type constraintKindOrLeftOf<kind extends ConstraintKind> =
	| kind
	| constraintKindLeftOf<kind>

type intersectConstraintKinds<
	l extends ConstraintKind,
	r extends ConstraintKind
> = Node<l | r | "unit" | "union"> | Disjoint | null

export const throwInvalidOperandError = (
	...args: Parameters<typeof writeInvalidOperandMessage>
): never => throwParseError(writeInvalidOperandMessage(...args))

export const writeInvalidOperandMessage = <
	kind extends ConstraintKind,
	expected extends BaseSchema,
	actual extends BaseSchema
>(
	kind: kind,
	expected: expected,
	actual: actual
): writeInvalidOperandMessage<kind, actual> =>
	`${capitalize(kind)} operand must be ${
		expected.description
	} (was ${actual.exclude(expected)})` as never

export type writeInvalidOperandMessage<
	kind extends ConstraintKind,
	actual extends BaseSchema
> = `${Capitalize<kind>} operand must be ${describeExpression<
	Prerequisite<kind>
>} (was ${describeExpression<actual["infer"]>})`

export interface ConstraintAttachments {
	impliedBasis: BaseSchema | null
	impliedSiblings?: array<BaseConstraint> | null
}

export interface BaseConstraintDeclaration extends BaseNodeDeclaration {
	kind: ConstraintKind
	attachments: ConstraintAttachments
}

export class BaseConstraint<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out d extends BaseConstraintDeclaration = BaseConstraintDeclaration
> extends BaseNode<d["prerequisite"], d> {
	readonly [arkKind] = "constraint"

	intersect<r extends BaseConstraint>(
		r: r
	): intersectConstraintKinds<d["kind"], r["kind"]> {
		return this.intersectInternal(r) as never
	}
}

export type PrimitiveConstraintKind = Exclude<ConstraintKind, PropKind>
