import { CompiledFunction } from "@arktype/util"
import type { Node } from "../base.js"
import type { TraversalKind } from "../traversal/context.js"
import type { Discriminant } from "../types/discriminate.js"
import type { PrimitiveKind } from "./implement.js"

export const jsData = "data"
export const jsCtx = "ctx"

export type InvokeOptions = {
	arg?: string
	kind?: TraversalKind
}

export class NodeCompiler extends CompiledFunction<
	[typeof jsData, typeof jsCtx]
> {
	path: string[] = []
	discriminants: Discriminant[] = []

	constructor(public traversalKind: TraversalKind) {
		super(jsData, jsCtx)
	}

	invoke(node: Node, opts?: InvokeOptions) {
		const method = `${node.name}${opts?.kind ?? this.traversalKind}`
		const arg = opts?.arg ?? this.data
		// TODO: only context if needed
		return `this.${method}(${arg}, ${this.ctx})`
	}

	traverseKey(serializedKey: string, block: () => this) {
		this.line(`${this.ctx}.path.push(${serializedKey})`)
		block()
		return this.line(`${this.ctx}.path.pop()`)
	}

	check(node: Node, opts?: InvokeOptions) {
		return this.traversalKind === "Allows"
			? this.if(`!${this.invoke(node, opts)}`, () => this.return(false))
			: this.line(this.invoke(node, opts))
	}

	compilePrimitive(node: Node<PrimitiveKind>) {
		const pathString = this.path.join()
		if (
			node.kind === "domain" &&
			node.domain === "object" &&
			this.discriminants.some((d) => d.path.join().startsWith(pathString))
		) {
			// if we've already checked a path at least as long as the current one,
			// we don't need to revalidate that we're in an object
			return this
		}
		if (
			(node.kind === "domain" || node.kind === "unit") &&
			this.discriminants.some(
				(d) =>
					d.path.join() === pathString &&
					(node.kind === "domain"
						? d.kind === "domain" || d.kind === "value"
						: d.kind === "value")
			)
		) {
			// if the discriminant has already checked the domain at the current path
			// (or an exact value, implying a domain), we don't need to recheck it
			return this
		}
		if (this.traversalKind === "Allows") {
			return this.return(node.compiledCondition)
		}
		return this.if(node.compiledNegation, () =>
			this.line(`${this.ctx}.error(${JSON.stringify(node.expectedContext)})`)
		)
	}

	writeMethod(name: string) {
		return `${name}(${this.argNames.join(", ")}){\n${this.body}    }\n`
	}
}
