import type { Morph } from "../parse/tuple/morph.ts"
import type { DistributedFunctionNode } from "../parse/tuple/utils.ts"
import type { Scope } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import type {
    autocomplete,
    Dict,
    mutable,
    stringKeyOf
} from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { SetOperation, SetOperationResult } from "./compose.ts"
import { composeKeyedOperation, empty, equal } from "./compose.ts"
import type { Keyword } from "./keywords.ts"
import type {
    ExactValueEntry,
    Predicate,
    TraversalPredicate
} from "./predicate.ts"
import {
    compilePredicate,
    predicateIntersection,
    predicateUnion
} from "./predicate.ts"
import { resolveFlat, resolveInput, rootIsMorph } from "./resolve.ts"
import type { TraversalSubdomainRule } from "./rules/subdomain.ts"

export type TypeNode<$ = Dict> = Identifier<$> | TypeRoot<$>

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type TypeRoot<$ = Dict> = ValidatorNode<$> | MorphNode<$>

export type Identifier<$ = Dict> = string extends keyof $
    ? autocomplete<Keyword>
    : Keyword | stringKeyOf<$>

export type MorphNode<$ = Dict> = {
    readonly input: TypeNode<$>
    readonly morph: DistributedFunctionNode<Morph>
}

export type ValidatorNode<$ = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, $>
}

export type TraversalNode =
    | Domain
    | SingleDomainTraversalNode
    | MultiDomainTraversalNode
    | CyclicReferenceNode

export type SingleDomainTraversalNode = readonly [
    ExplicitDomainEntry | ImplicitDomainEntry,
    ...TraversalPredicate
]

export type CyclicReferenceNode = [["alias", string]]

export type ExplicitDomainEntry = ["domain", Domain]

export type ImplicitDomainEntry =
    | ExactValueEntry
    | ["subdomain", TraversalSubdomainRule]

const hasImpliedDomain = (
    flatPredicate: TraversalPredicate | SingleDomainTraversalNode
): flatPredicate is SingleDomainTraversalNode =>
    flatPredicate[0] &&
    (flatPredicate[0][0] === "subdomain" || flatPredicate[0][0] === "value")

export type MultiDomainTraversalNode = [MultiDomainEntry]

export type MultiDomainEntry = ["domains", TraversalTypeSet]

export type TraversalTypeSet = {
    readonly [domain in Domain]?: TraversalPredicate
}

export const compileNode = (node: TypeNode, $: Scope): TraversalNode => {
    if (typeof node === "string") {
        return resolveFlat(node, $)
    }
    if (rootIsMorph(node)) {
        return "null"
    }
    const domains = keysOf(node)
    if (domains.length === 1) {
        const domain = domains[0]
        const predicate = node[domain]!
        if (predicate === true) {
            return domain
        }
        const flatPredicate = compilePredicate(domain, predicate, $)
        return hasImpliedDomain(flatPredicate)
            ? flatPredicate
            : [["domain", domain], ...flatPredicate]
    }
    const result: mutable<TraversalTypeSet> = {}
    for (const domain of domains) {
        result[domain] = compilePredicate(domain, node[domain]!, $)
    }
    return [["domains", result]]
}

export type ScopeNodes = { readonly [k in string]: TypeRoot }

export type CompiledScopeNodes<nodes extends ScopeNodes> = {
    readonly [k in keyof nodes]: TraversalNode
}

export const compileNodes = <nodes extends ScopeNodes>(
    nodes: nodes,
    $: Scope
): CompiledScopeNodes<nodes> => {
    const result = {} as mutable<CompiledScopeNodes<nodes>>
    for (const name in nodes) {
        result[name] = compileNode(nodes[name], $)
    }
    return result
}

export const composeNodeOperation =
    (
        validatorOperation: SetOperation<ValidatorNode, Scope>
    ): SetOperation<TypeNode, Scope> =>
    (l, r, $) => {
        const lResolution = resolveInput(l, $)
        const rResolution = resolveInput(r, $)
        const result = validatorOperation(lResolution, rResolution, $)
        return result === lResolution ? l : result === rResolution ? r : result
    }

export const finalizeNodeOperation = (
    l: TypeNode,
    result: SetOperationResult<TypeNode>
): TypeNode => (result === empty ? "never" : result === equal ? l : result)

const validatorIntersection = composeKeyedOperation<ValidatorNode, Scope>(
    (domain, l, r, $) => {
        if (l === undefined) {
            return r === undefined ? equal : undefined
        }
        if (r === undefined) {
            return undefined
        }
        return predicateIntersection(domain, l, r, $)
    },
    { onEmpty: "delete" }
)

export const nodeIntersection = composeNodeOperation(validatorIntersection)

export const intersection = (l: TypeNode, r: TypeNode, $: Scope) =>
    finalizeNodeOperation(l, nodeIntersection(l, r, $))

export const union = (l: TypeNode, r: TypeNode, $: Scope) =>
    finalizeNodeOperation(l, nodeUnion(l, r, $))

export const validatorUnion = composeKeyedOperation<ValidatorNode, Scope>(
    (domain, l, r, scope) => {
        if (l === undefined) {
            return r === undefined ? equal : r
        }
        if (r === undefined) {
            return l
        }
        return predicateUnion(domain, l, r, scope)
    },
    { onEmpty: "throw" }
)

export const nodeUnion = composeNodeOperation(validatorUnion)
