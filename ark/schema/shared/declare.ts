import type { evaluate, merge } from "@arktype/util"
import type { NarrowedAttachments, Node } from "../base.js"
import type { reducibleKindOf } from "../kinds.js"
import type { Disjoint } from "./disjoint.js"
import type { NodeKind } from "./implement.js"

export interface BaseMeta {
	readonly description?: string
}

export const metaKeys: { [k in keyof BaseMeta]: 1 } = { description: 1 }

export type NodeCompositionKind = "primitive" | "composite"

interface BaseDeclarationInput {
	kind: NodeKind
	schema: unknown
	normalizedSchema: BaseMeta
	inner: BaseMeta
	reducibleTo?: NodeKind
	hasOpenIntersection?: true
	expectedContext?: object
	prerequisite?: unknown
}

export interface BaseExpectedContext<kind extends NodeKind = NodeKind> {
	code: kind
}

interface CompositeDeclarationInput extends BaseDeclarationInput {
	composition: "composite"
	childKind: NodeKind
}

interface PrimitiveDeclarationInput extends BaseDeclarationInput {
	composition: "primitive"
	childKind?: never
}

type DeclarationInput = CompositeDeclarationInput | PrimitiveDeclarationInput

export type defaultExpectedContext<d extends DeclarationInput> = evaluate<
	BaseExpectedContext<d["kind"]> & { description: string } & d["inner"]
>

export type requireDescriptionIfPresent<t> = "description" extends keyof t
	? t & { description: string }
	: t

export type declareNode<
	d extends {
		[k in keyof d]: k extends keyof DeclarationInput
			? DeclarationInput[k]
			: never
	} & DeclarationInput
> = merge<
	{
		hasOpenIntersection: false
		prerequisite: prerequisiteOf<d>
		childKind: never
		reducibleTo: null
		expectedContext: null
	},
	d & {
		expectedContext: d["expectedContext"] extends {}
			? BaseExpectedContext<d["kind"]> &
					// description should always be populated if it's part of the context
					requireDescriptionIfPresent<d["expectedContext"]>
			: null
	}
>

type prerequisiteOf<d extends DeclarationInput> = "prerequisite" extends keyof d
	? d["prerequisite"]
	: unknown

export type attachmentsOf<d extends BaseNodeDeclaration> =
	NarrowedAttachments<d> & d["inner"]

export type BaseNodeDeclaration = {
	kind: NodeKind
	schema: unknown
	normalizedSchema: BaseMeta
	inner: BaseMeta
	reducibleTo: NodeKind | null
	prerequisite: any
	hasOpenIntersection: boolean
	childKind: NodeKind
	expectedContext: BaseExpectedContext | null
}

export type ownIntersectionResult<d extends BaseNodeDeclaration> =
	| Node<reducibleKindOf<d["kind"]>>
	| Disjoint
