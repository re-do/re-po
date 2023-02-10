import { serializeCase } from "../nodes/discriminate.js"
import type {
    TraversalEntry,
    TraversalKey,
    TraversalNode,
    TraversalValue
} from "../nodes/node.js"
import { checkClass } from "../nodes/rules/class.js"
import { checkDivisor } from "../nodes/rules/divisor.js"
import { checkBound } from "../nodes/rules/range.js"
import { checkRegex } from "../nodes/rules/regex.js"
import { precedenceMap } from "../nodes/rules/rules.js"
import type { QualifiedTypeName, Type, TypeConfig } from "../scopes/type.js"
import type { Domain } from "../utils/domains.js"
import { domainOf, hasDomain } from "../utils/domains.js"
import type { extend, stringKeyOf } from "../utils/generics.js"
import { hasKey, keysOf } from "../utils/generics.js"
import { getPath, Path } from "../utils/paths.js"
import type { SerializedPrimitive } from "../utils/serialize.js"
import { deserializePrimitive } from "../utils/serialize.js"
import type { SizedData } from "../utils/size.js"
import type { ProblemCode, ProblemWriters } from "./problems.js"
import { defaultProblemWriters, Problems } from "./problems.js"

// TODO: include data wrapper in state
export class TraversalState<data = unknown> {
    path = new Path()
    problems = new Problems(this)
    configs: TypeConfig[]
    failFast = false

    #seen: { [name in QualifiedTypeName]?: object[] } = {}
    #traversalStack: any[] = []

    constructor(public data: data, public type: Type) {
        this.configs = type.meta.scope.config ? [type.meta.scope.config] : []
    }

    getConfigForProblemCode<code extends ProblemCode>(
        code: code
    ): ProblemWriters<code> {
        if (!this.configs.length) {
            return defaultProblemWriters[code]
        }
        for (let i = this.configs.length - 1; i >= 0; i--) {
            if (this.configs[i][code] || this.configs[i]["defaults"]) {
                return {
                    ...defaultProblemWriters[code],
                    ...this.configs[i]["defaults"],
                    ...this.configs[i][code]
                }
            }
        }
        return defaultProblemWriters[code]
    }

    traverseKey(key: stringKeyOf<this["data"]>, node: TraversalNode) {
        this.#traversalStack.push(this.data)
        this.data = this.data[key] as data
        // TODO: make path externally readonly
        this.path.push(key)
        traverse(node, this)
        this.path.pop()
        this.data = this.#traversalStack.pop()
    }

    traverseResolution(name: string): boolean {
        const resolution = this.type.meta.scope.resolve(name)
        const id = resolution.meta.id
        // this assignment helps with narrowing
        const data = this.data
        const isObject = hasDomain(data, "object")
        if (isObject) {
            if (hasKey(this.#seen, id)) {
                if (this.#seen[id].includes(data)) {
                    // if data has already been checked by this alias as part of
                    // a resolution higher up on the call stack, it must be valid
                    // or we wouldn't be here
                    return true
                }
                this.#seen[id].push(data)
            } else {
                this.#seen[id] = [data]
            }
        }
        const lastResolution = this.type
        this.type = resolution
        const result = traverse(data, resolution.flat, this)
        this.type = lastResolution
        if (isObject) {
            this.#seen[id]!.pop()
        }
        return result
    }

    traverseBranches(branches: TraversalEntry[][]): boolean {
        const lastFailFast = this.failFast
        this.failFast = true
        const lastProblems = this.problems
        const branchProblems = new Problems(this)
        this.problems = branchProblems
        const lastPath = this.path
        let hasValidBranch = false
        for (const branch of branches) {
            this.path = new Path()
            if (checkEntries(branch, this)) {
                hasValidBranch = true
                break
            }
        }
        this.path = lastPath
        this.problems = lastProblems
        this.failFast = lastFailFast
        return (
            hasValidBranch ||
            this.problems.add("branches", this.data, branchProblems)
        )
    }
}

export const traverse = (node: TraversalNode, state: TraversalState): boolean =>
    typeof node === "string"
        ? domainOf(state.data) === node ||
          state.problems.add("domain", state.data, node)
        : checkEntries(node, state)

export const checkEntries = (
    entries: TraversalEntry[],
    state: TraversalState
): boolean => {
    let isValid = true
    for (let i = 0; i < entries.length; i++) {
        const [k, v] = entries[i]
        if (k === "morph") {
            if (typeof v === "function") {
                v(state.data)
                return true
            }
            for (const morph of v) {
                morph(state.data)
            }
            return true
        }
        isValid ||= (entryTraversals[k] as EntryTraversal<any>)(
            state.data,
            v,
            state
        )
        if (!isValid) {
            if (state.failFast) {
                return false
            }
            if (
                i < entries.length - 1 &&
                precedenceMap[k] < precedenceMap[entries[i + 1][0]]
            ) {
                // if we've encountered a problem, there is at least one entry
                // remaining, and the next entry is of a higher precedence level
                // than the current entry, return immediately
                return false
            }
        }
    }
    return isValid
}

const checkProps: EntryTraversal<"props"> = (propSets, state) => {
    return true
    // let requiredProps = propSets.required
    // let out: Record<string | number, unknown>
    // if (propSets.index) {
    //     if (!Array.isArray(data)) {
    //         return state.problems.add("class", data, "Array")
    //     }
    //     if (requiredProps) {
    //         // copy requiredProps so we can mutate it with ephemeral entries
    //         // representing index nodes
    //         const updatedRequiredProps: TraversalProp[] = []
    //         const existingKeys: Record<string, true> = {}
    //         for (let i = 0; i < requiredProps.length; i++) {
    //             existingKeys[requiredProps[i][0]] = true
    //             updatedRequiredProps.push(requiredProps[i])
    //         }
    //         for (let i = 0; i < data.length; i++) {
    //             if (!existingKeys[i]) {
    //                 updatedRequiredProps.push([`${i}`, propSets.index])
    //             }
    //         }
    //         requiredProps = updatedRequiredProps
    //     } else {
    //         requiredProps = data.map((_, i) => [`${i}`, propSets.index!])
    //     }
    //     out = [] as Record<number, unknown>
    // } else {
    //     out = {}
    // }
    // if (requiredProps) {
    //     result = checkNamedProps(data, requiredProps, state, out, "required")
    //     if (result instanceof Problem && state.failFast) {
    //         return result
    //     }
    // }
    // if (propSets.optional) {
    //     result = checkNamedProps(
    //         data,
    //         propSets.optional,
    //         state,
    //         out,
    //         "optional"
    //     )
    // }
    // return result
}

// const checkNamedProps = (
//     data: Record<string | number, unknown>,
//     props: TraversalProp[],
//     state: TraversalState,
//     out: Record<string | number, unknown>,
//     kind: "optional" | "required"
// ) => {
//     let firstProblem: Problem | undefined
//     for (const [propKey, propNode] of props as TraversalProp[]) {
//         let result: TraversalReturn
//         if (propKey in data) {
//             state.path.push(propKey)
//             result = traverse(data[propKey], propNode, state)
//             state.path.pop()
//         } else if (kind === "optional") {
//             continue
//         } else {
//             result = state.problems.add("missing", undefined, undefined, {
//                 path: state.path.concat(propKey)
//             })
//         }
//         if (!firstProblem) {
//             if (result instanceof Problem) {
//                 if (state.failFast) {
//                     return result
//                 }
//                 firstProblem = result
//             } else {
//                 out[propKey] = result
//             }
//         }
//     }
//     return firstProblem ?? out
// }

const entryTraversals = {
    regex: checkRegex,
    divisor: checkDivisor,
    domains: (domains, state) => {
        const entries = domains[domainOf(state.data)]
        return entries
            ? checkEntries(entries, state)
            : state.problems.add("domainBranches", state.data, keysOf(domains))
    },
    domain: (domain, state) =>
        domainOf(state.data) === domain ||
        // TODO: remove data from problem params
        state.problems.add("domain", state.data, domain),
    bound: checkBound,
    props: checkProps,
    branches: (branches, state) => state.traverseBranches(branches),
    switch: (rule, state) => {
        const dataAtPath = getPath(state.data, rule.path)
        const caseKey = serializeCase(rule.kind, dataAtPath)
        if (hasKey(rule.cases, caseKey)) {
            return checkEntries(rule.cases[caseKey], state)
        }
        const caseKeys = keysOf(rule.cases)
        const missingCasePath = state.path.concat(rule.path)
        return rule.kind === "value"
            ? state.problems.add(
                  "valueBranches",
                  dataAtPath,
                  caseKeys.map((k) =>
                      deserializePrimitive(k as SerializedPrimitive)
                  ),
                  { path: missingCasePath }
              )
            : state.problems.add(
                  "domainBranches",
                  dataAtPath,
                  caseKeys as Domain[],
                  { path: missingCasePath }
              )
    },
    alias: (name, state) => state.traverseResolution(name),
    class: checkClass,
    // TODO: fix
    narrow: (narrow, state) => narrow(state.data, state.problems),
    config: ({ config, node }, state) => {
        state.configs.push(config)
        const result = traverse(node, state)
        state.configs.pop()
        return result
    },
    value: (value, state) =>
        state.data === value || state.problems.add("value", state.data, value)
} satisfies {
    [k in ValidationTraversalKey]: EntryTraversal<k>
}

export type ValidationTraversalKey = Exclude<TraversalKey, "morph">

export type EntryTraversal<k extends TraversalKey> = (
    constraint: TraversalValue<k>,
    state: TraversalState<RuleData<k>>
) => boolean

export type ConstrainedRuleTraversalData = extend<
    { [k in TraversalKey]?: unknown },
    {
        regex: string
        divisor: number
        bound: SizedData
        props: Record<string | number, unknown>
    }
>

export type RuleData<k extends TraversalKey> =
    k extends keyof ConstrainedRuleTraversalData
        ? ConstrainedRuleTraversalData[k]
        : unknown
