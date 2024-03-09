import { throwParseError, type Stringifiable } from "@arktype/util"
import {
	BaseNode,
	type ConstraintNode,
	type Node,
	type NodeSubclass,
	type TypeNode
} from "../base.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../shared/context.js"
import type { BaseMeta, BaseNodeDeclaration } from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type {
	BasisKind,
	ConstraintKind,
	PropKind,
	kindLeftOf
} from "../shared/implement.js"

export type constraintKindLeftOf<kind extends ConstraintKind> = ConstraintKind &
	kindLeftOf<kind>

export type constraintKindOrLeftOf<kind extends ConstraintKind> =
	| kind
	| constraintKindLeftOf<kind>

export interface PrimitiveConstraintInner<rule = unknown> extends BaseMeta {
	readonly rule: rule
}

export interface BaseConstraintDeclaration extends BaseNodeDeclaration {
	kind: ConstraintKind
}

type intersectConstraintKinds<
	l extends ConstraintKind,
	r extends ConstraintKind
> = Node<l | r | "unit" | "union"> | Disjoint | null

export const throwInvalidOperandError = (
	...args: Parameters<typeof writeInvalidOperandMessage>
) => throwParseError(writeInvalidOperandMessage(...args))

export const writeInvalidOperandMessage = (
	kind: ConstraintKind,
	expected: Node | Stringifiable,
	actual: Node | undefined
) => `${kind} operand must be ${expected} (was ${actual})`

export type writeInvalidOperandMessage<
	kind extends ConstraintKind,
	expected extends Stringifiable,
	basis extends Stringifiable
> = `${kind} operand must be ${expected} (was ${basis})`

export abstract class BaseConstraint<
	d extends BaseConstraintDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<d["prerequisite"], d, subclass> {
	abstract readonly impliedBasis: TypeNode | undefined
	readonly impliedSiblings?: ConstraintNode[] | undefined

	attachTo(node: TypeNode) {
		if (this.impliedBasis && !node.extends(this.impliedBasis)) {
			return throwInvalidOperandError(this.kind, this.impliedBasis, node)
		}
		return node
	}

	intersect<r extends ConstraintNode>(
		r: r
	): intersectConstraintKinds<d["kind"], r["kind"]> {
		return this.intersectInternal(r) as never
	}
}

export type PrimitiveConstraintKind = Exclude<ConstraintKind, PropKind>

export abstract class BasePrimitiveConstraint<
	d extends BaseConstraintDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseConstraint<d, subclass> {
	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string
	abstract readonly errorContext: d["errorContext"]

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.description)
		}
	}

	compile(js: NodeCompiler) {
		js.compilePrimitive(this as never)
	}
}
