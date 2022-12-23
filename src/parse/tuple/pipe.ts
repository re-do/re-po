import { intersection } from "../../nodes/intersection.ts"
import type { TypeSet } from "../../nodes/node.ts"
import type { Dict, mutable, NonEmptyList } from "../../utils/generics.ts"
import type {
    inferDefinition,
    InferenceContext,
    validateDefinition
} from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { TupleExpressionParser } from "./tuple.ts"
import type { distributable } from "./utils.ts"
import { entriesOfDistributableFunction } from "./utils.ts"

export const parsePipeTuple: TupleExpressionParser<"|>"> = (def, scope) => {
    const inputNode = parseDefinition(def[0], scope)
    const distributedValidatorEntries = entriesOfDistributableFunction(
        def[2] as distributable<Pipe>,
        inputNode,
        scope
    )
    const distributedValidatorNode: mutable<TypeSet> = {}
    for (const [domain, validator] of distributedValidatorEntries) {
        distributedValidatorNode[domain] = { validator }
    }
    return intersection(inputNode, distributedValidatorNode, scope)
}

export type validatePipeTuple<pipedDef, c extends InferenceContext> = [
    validateDefinition<pipedDef, c>,
    "|>",
    ...NonEmptyList<distributable<Pipe<inferDefinition<pipedDef, c>>>>
]

// TODO: Pipe would only maintain the domains/subdomains. Other rules like bounds/regex would go away
export type Pipe<T = any> = (In: T) => T

export type PipeBuilder<scope extends Dict = {}> = <
    def,
    pipes extends NonEmptyList<
        distributable<Pipe<inferDefinition<def, { scope: scope }>>>
    >
>(
    def: validateDefinition<def, { scope: scope }>,
    ...pipes: pipes
) => [def, "|>", ...pipes]

export const pipe: PipeBuilder = (def, ...pipes) => [def as any, "|>", ...pipes]
