import {
	entriesOf,
	flatMorph,
	fromEntries,
	isArray,
	printable,
	register,
	throwInternalError,
	throwParseError,
	type entryOf
} from "@arktype/util"
import type { Node } from "../kinds.js"
import type { BaseNode } from "../node.js"
import type { BaseRoot } from "../roots/root.js"
import type { BoundKind } from "./implement.js"
import { hasArkKind } from "./utils.js"

type DisjointKinds = {
	domain?: {
		l: Node<"domain">
		r: Node<"domain">
	}
	unit?: {
		l: Node<"unit">
		r: Node<"unit">
	}
	proto?: {
		l: Node<"proto">
		r: Node<"proto">
	}
	presence?: {
		l: BaseRoot
		r: BaseRoot
	}
	range?: {
		l: Node<BoundKind>
		r: Node<BoundKind>
	}
	// exactly one of l or r should be a UnitNode
	assignability?: {
		l: BaseNode
		r: BaseNode
	}
	union?: {
		l: readonly BaseRoot[]
		r: readonly BaseRoot[]
	}
	indiscriminableMorphs?: {
		l: Node<"union">
		r: Node<"union">
	}
	interesectedMorphs?: {
		l: Node<"morph">
		r: Node<"morph">
	}
}

export type DisjointKindEntries = entryOf<DisjointKinds>[]

export type SerializedPath = `[${string}]`

export type DisjointsSources = {
	[k in `${SerializedPath}`]: DisjointsAtPath
}

export type DisjointsAtPath = {
	[kind in DisjointKind]?: DisjointKinds[kind]
}

export type DisjointSourceEntry = entryOf<DisjointsSources>

export type DisjointSource = Required<DisjointKinds>[DisjointKind]

export type FlatDisjointEntry = {
	path: SerializedPath
	kind: DisjointKind
	disjoint: DisjointSource
}

export type DisjointKind = keyof DisjointKinds

export class Disjoint {
	constructor(public sources: DisjointsSources) {}

	clone(): Disjoint {
		return new Disjoint(this.sources)
	}

	static from<kind extends DisjointKind>(
		kind: kind,
		l: Required<DisjointKinds>[kind]["l"],
		r: Required<DisjointKinds>[kind]["r"]
	): Disjoint {
		return new Disjoint({
			"[]": {
				[kind]: {
					l,
					r
				}
			}
		})
	}

	static fromEntries(entries: DisjointKindEntries): Disjoint {
		if (!entries.length) {
			return throwInternalError(
				"Unexpected attempt to create a disjoint from no entries"
			)
		}
		return new Disjoint({ "[]": fromEntries(entries) })
	}

	get flat(): FlatDisjointEntry[] {
		return entriesOf(this.sources).flatMap(([path, disjointKinds]) =>
			entriesOf(disjointKinds).map(([kind, disjoint]) => ({
				path,
				kind,
				disjoint
			}))
		)
	}

	describeReasons(): string {
		const reasons = this.flat
		if (reasons.length === 1) {
			const { path, disjoint } = reasons[0]
			const pathString = JSON.parse(path).join(".")
			return `Intersection${
				pathString && ` at ${pathString}`
			} of ${describeReasons(disjoint)} results in an unsatisfiable type`
		}
		return `The following intersections result in unsatisfiable types:\n• ${reasons
			.map(({ path, disjoint }) => `${path}: ${describeReasons(disjoint)}`)
			.join("\n• ")}`
	}

	isEmpty(): boolean {
		return this.flat.length === 0
	}

	throw(): never {
		return throwParseError(this.describeReasons())
	}

	invert(): Disjoint {
		const invertedEntries = entriesOf(this.sources).map(
			([path, disjoints]) =>
				[
					path,
					flatMorph(disjoints, (kind, disjoint) => [
						kind,
						{ l: disjoint.r, r: disjoint.l }
					])
				] as DisjointSourceEntry
		)
		return new Disjoint(fromEntries(invertedEntries))
	}

	add(input: Disjoint): void {
		entriesOf(input.sources).forEach(([path, disjoints]) =>
			Object.assign((this.sources[path] ??= {}), disjoints)
		)
	}

	withPrefixKey(key: string | symbol): Disjoint {
		const entriesWithPrefix = entriesOf(this.sources).map(
			([path, disjoints]): DisjointSourceEntry => {
				const segments = JSON.parse(path) as string[]
				segments.unshift(typeof key === "symbol" ? register(key) : key)
				const pathWithPrefix = JSON.stringify(segments) as `[${string}]`
				return [pathWithPrefix, disjoints]
			}
		)
		return new Disjoint(fromEntries(entriesWithPrefix))
	}

	toString(): string {
		return printable(this.sources)
	}
}

const describeReasons = (source: DisjointSource): string =>
	`${describeReason(source.l)} and ${describeReason(source.r)}`

const describeReason = (value: unknown): string =>
	hasArkKind(value, "root") ? value.expression
	: isArray(value) ? value.map(describeReason).join(" | ")
	: String(value)
