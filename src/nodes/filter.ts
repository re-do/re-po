import type { Filter } from "../parse/ast/filter.js"
import { intersectUniqueLists, listFrom } from "../utils/generics.js"
import type { CompilationState, CompiledAssertion } from "./node.js"
import { Node } from "./node.js"

export class FilterNode extends Node<typeof FilterNode> {
    static readonly kind = "filter"
    predicates: readonly Filter[]

    constructor(predicates: Filter | Filter[]) {
        const predicateList = listFrom(predicates)
        super(FilterNode, predicateList)
        this.predicates = predicateList
    }

    static compile(predicates: readonly Filter[]): CompiledAssertion {
        return `data !== data`
    }

    compileTraversal(s: CompilationState) {
        return s.ifNotThen(this.key, s.problem("custom", "filters"))
    }

    intersect(other: FilterNode) {
        return new FilterNode(
            intersectUniqueLists(this.predicates, other.predicates)
        )
    }
}
