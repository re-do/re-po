import type { Condition } from "../nodes/predicate.ts"
import { compileCondition, conditionIntersection } from "../nodes/predicate.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import type { keySet, List } from "../utils/generics.ts"
import { isKeyOf } from "../utils/generics.ts"
import type { Path } from "../utils/paths.ts"
import { popKey, pushKey } from "../utils/paths.ts"
import type { SerializablePrimitive } from "../utils/serialize.ts"
import { serializePrimitive } from "../utils/serialize.ts"
import type { DisjointKind } from "./compose.ts"
import type { TraversalEntry } from "./node.ts"
import { initializeIntersectionContext } from "./node.ts"
import { isExactValuePredicate } from "./resolve.ts"
import { compileRules } from "./rules/rules.ts"

export type DiscriminatedSwitch = {
    readonly path: string
    readonly kind: DisjointKind
    readonly cases: DiscriminatedCases
}

export type DiscriminatedCases = {
    [caseKey in string]?: TraversalEntry[]
}

export const compileBranches = (branches: List<Condition>, $: ScopeRoot) => {
    const discriminants = calculateDiscriminants(branches, $)
    return discriminate(
        branches,
        branches.map((_, i) => i),
        discriminants,
        $
    )
}

type IndexCases = {
    [caseKey in string]: number[]
}

export type QualifiedDisjoint = `/${string}${DiscriminantKind}`

const discriminate = (
    originalBranches: List<Condition>,
    remainingIndices: number[],
    discriminants: Discriminants,
    $: ScopeRoot
): TraversalEntry[] => {
    if (remainingIndices.length === 1) {
        return compileCondition(originalBranches[remainingIndices[0]], $)
    }
    const bestDiscriminant = findBestDiscriminant(
        remainingIndices,
        discriminants
    )
    if (!bestDiscriminant) {
        return [
            [
                "branches",
                remainingIndices.map((i) =>
                    compileCondition(originalBranches[i], $)
                )
            ]
        ]
    }
    const cases = {} as DiscriminatedCases
    // TODO: allow undiscriminatable
    for (const caseKey in bestDiscriminant.indexCases) {
        cases[caseKey] = discriminate(
            originalBranches,
            bestDiscriminant.indexCases[caseKey],
            discriminants,
            $
        )
    }
    const [path, kind] = popKey(bestDiscriminant.qualifiedDisjoint) as [
        Path,
        DisjointKind
    ]
    return [
        [
            "switch",
            {
                path,
                kind,
                cases
            }
        ]
    ]
}

type Discriminants = {
    disjointsByPair: DisjointsByPair
    casesByDisjoint: CasesByDisjoint
}

type DisjointsByPair = Record<`${number}/${number}`, QualifiedDisjoint[]>

type CasesByDisjoint = {
    [k in QualifiedDisjoint]: IndexCases
}

export type DiscriminantKinds = {
    domain: Domain
    subdomain: Subdomain
    tupleLength: number
    value: unknown
}

const discriminantKinds: keySet<DiscriminantKind> = {
    domain: true,
    subdomain: true,
    tupleLength: true,
    value: true
}

export type DiscriminantKind = keyof DiscriminantKinds

const calculateDiscriminants = (
    branches: List<Condition>,
    $: ScopeRoot
): Discriminants => {
    const discriminants: Discriminants = {
        disjointsByPair: {},
        casesByDisjoint: {}
    }
    for (let lIndex = 0; lIndex < branches.length - 1; lIndex++) {
        for (let rIndex = lIndex + 1; rIndex < branches.length; rIndex++) {
            const pairKey = `${lIndex}/${rIndex}` as const
            const pairDisjoints: QualifiedDisjoint[] = []
            discriminants.disjointsByPair[pairKey] = pairDisjoints
            const context = initializeIntersectionContext($)
            conditionIntersection(branches[lIndex], branches[rIndex], context)
            let path: Path
            for (path in context.disjoints) {
                const disjointContext = context.disjoints[path]
                const kind = disjointContext.kind
                if (!isKeyOf(kind, discriminantKinds)) {
                    continue
                }
                const l = disjointContext.operands[0]
                const r = disjointContext.operands[1]
                const lSerialized = serializeIfAllowed(kind, l)
                const rSerialized = serializeIfAllowed(kind, r)
                if (lSerialized === undefined || rSerialized === undefined) {
                    continue
                }
                const qualifiedDisjoint = pushKey(path, kind)
                pairDisjoints.push(qualifiedDisjoint)
                if (!discriminants.casesByDisjoint[qualifiedDisjoint]) {
                    discriminants.casesByDisjoint[qualifiedDisjoint] = {
                        [lSerialized]: [lIndex],
                        [rSerialized]: [rIndex]
                    }
                    continue
                }
                const cases = discriminants.casesByDisjoint[qualifiedDisjoint]
                if (!cases[lSerialized]) {
                    cases[lSerialized] = [lIndex]
                } else if (!cases[lSerialized].includes(lIndex)) {
                    cases[lSerialized].push(lIndex)
                }
                if (!cases[rSerialized]) {
                    cases[rSerialized] = [rIndex]
                } else if (!cases[rSerialized].includes(rIndex)) {
                    cases[rSerialized].push(rIndex)
                }
            }
        }
    }
    return discriminants
}

type Discriminant = {
    qualifiedDisjoint: QualifiedDisjoint
    indexCases: IndexCases
    score: number
}

const findBestDiscriminant = (
    remainingIndices: number[],
    discriminants: Discriminants
): Discriminant | undefined => {
    let bestDiscriminant: Discriminant | undefined
    for (let i = 0; i < remainingIndices.length - 1; i++) {
        const lIndex = remainingIndices[i]
        for (let j = i + 1; j < remainingIndices.length; j++) {
            const rIndex = remainingIndices[j]
            const candidates =
                discriminants.disjointsByPair[`${lIndex}/${rIndex}`]
            for (const qualifiedDisjoint of candidates) {
                const indexCases =
                    discriminants.casesByDisjoint[qualifiedDisjoint]
                const filteredCases: IndexCases = {}
                let score = 0
                for (const caseKey in indexCases) {
                    const filteredIndices = indexCases[caseKey].filter((i) =>
                        remainingIndices.includes(i)
                    )
                    if (filteredIndices.length === 0) {
                        continue
                    }
                    filteredCases[caseKey] = filteredIndices
                    score++
                }
                if (!bestDiscriminant || score > bestDiscriminant.score) {
                    bestDiscriminant = {
                        qualifiedDisjoint,
                        indexCases: filteredCases,
                        score
                    }
                }
            }
        }
    }
    return bestDiscriminant
}

const serializeIfAllowed = <kind extends DiscriminantKind>(
    kind: kind,
    data: DiscriminantKinds[kind]
) => {
    if (kind === "value") {
        const domain = domainOf(data)
        return domain === "object" || domain === "symbol"
            ? undefined
            : serializePrimitive(data as SerializablePrimitive)
    }
    return `${data}`
}
