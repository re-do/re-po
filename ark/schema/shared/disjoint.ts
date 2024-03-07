import {
	entriesOf,
	fromEntries,
	morph,
	printable,
	throwInternalError,
	throwParseError,
	type entryOf
} from "@arktype/util"
import type { Node } from "../base.js"
import type { RangeKind } from "../constraints/refinements/shared.js"
import type { ConstraintKind, kindRightOf } from "./implement.js"

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
	// TODO: test
	presence?:
		| {
				l: true
				r: false
		  }
		| {
				l: false
				r: true
		  }
	range?: {
		l: Node<RangeKind>
		r: Node<RangeKind>
	}
	assignability?:
		| {
				l: unknown
				r: Node<ConstraintKind>
		  }
		| {
				l: Node<ConstraintKind>
				r: unknown
		  }
	union?: {
		l: readonly Node<kindRightOf<"union">>[]
		r: readonly Node<kindRightOf<"union">>[]
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

export type DisjointKind = keyof DisjointKinds

export class Disjoint {
	constructor(public sources: DisjointsSources) {}

	clone() {
		return new Disjoint(this.sources)
	}

	static from<kind extends DisjointKind>(
		kind: kind,
		l: Required<DisjointKinds>[kind]["l"],
		r: Required<DisjointKinds>[kind]["r"]
	) {
		return new Disjoint({
			"[]": {
				[kind]: {
					l,
					r
				}
			}
		})
	}

	static fromEntries(entries: DisjointKindEntries) {
		if (!entries.length) {
			return throwInternalError(
				`Unexpected attempt to create a disjoint from no entries`
			)
		}
		return new Disjoint({ "[]": fromEntries(entries) })
	}

	get flat() {
		return entriesOf(this.sources).flatMap(([path, disjointKinds]) =>
			entriesOf(disjointKinds).map(([kind, disjoint]) => ({
				path,
				kind,
				disjoint
			}))
		)
	}

	describeReasons() {
		const reasons = this.flat
		if (reasons.length === 1) {
			const { path, disjoint } = reasons[0]
			const pathString = JSON.parse(path).join(".")
			return `Intersection${pathString && ` at ${pathString}`} of ${
				disjoint.l
			} and ${disjoint.r} results in an unsatisfiable type`
		}
		return `The following intersections result in unsatisfiable types:\n• ${reasons
			.map(({ path, disjoint }) => `${path}: ${disjoint.l} and ${disjoint.r}`)
			.join("\n• ")}`
	}

	isEmpty() {
		return this.flat.length === 0
	}

	throw() {
		return throwParseError(this.describeReasons())
	}

	invert() {
		const invertedEntries = entriesOf(this.sources).map(
			([path, disjoints]) =>
				[
					path,
					morph(disjoints, (kind, disjoint) => [
						kind,
						{ l: disjoint.r, r: disjoint.l }
					])
				] as DisjointSourceEntry
		)
		return new Disjoint(fromEntries(invertedEntries))
	}

	add(input: Disjoint) {
		entriesOf(input.sources).forEach(([path, disjoints]) =>
			Object.assign(this.sources[path] ?? {}, disjoints)
		)
	}

	withPrefixKey(key: string) {
		const entriesWithPrefix = entriesOf(this.sources).map(
			([path, disjoints]): DisjointSourceEntry => {
				const segments = JSON.parse(path) as string[]
				segments.unshift(key)
				const pathWithPrefix = JSON.stringify(segments) as `[${string}]`
				return [pathWithPrefix, disjoints]
			}
		)
		return new Disjoint(fromEntries(entriesWithPrefix))
	}

	toString() {
		return printable(this.sources)
	}
}
