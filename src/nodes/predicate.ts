import { writeUnboundableMessage } from "../parse/ast/bound.js"
import { writeIndivisibleMessage } from "../parse/ast/divisor.js"
import type { inferMorphOut, Morph, Out } from "../parse/ast/morph.js"
import type { GuardedNarrow, Narrow } from "../parse/ast/narrow.js"
import type { Domain, inferDomain } from "../utils/domains.js"
import { throwInternalError, throwParseError } from "../utils/errors.js"
import type { evaluate, isUnknown } from "../utils/generics.js"
import type { List, listable } from "../utils/lists.js"
import type { Constructor, instanceOf } from "../utils/objectKinds.js"
import { type keySet } from "../utils/records.js"
import type { BasisInput, BasisNode, inferBasis } from "./basis/basis.js"
import { basisPrecedenceByKind } from "./basis/basis.js"
import { basisNodeFrom } from "./basis/from.js"
import { ValueNode } from "./basis/value.js"
import type { DivisorNode } from "./constraints/divisor.js"
import type { MorphNode } from "./constraints/morph.js"
import type { NarrowNode } from "./constraints/narrow.js"
import type { inferPropsInput } from "./constraints/props/infer.js"
import type { PropsInput, PropsNode } from "./constraints/props/props.js"
import type { Range, RangeNode } from "./constraints/range.js"
import type { RegexNode } from "./constraints/regex.js"
import { Disjoint } from "./disjoint.js"
import type { Node } from "./node.js"
import { defineNodeKind } from "./node.js"

export type PredicateNode = Node<
    {
        kind: "predicate"
        rule: PredicateRules
        intersected: PredicateNode
    },
    {
        basis: BasisNode | undefined
        constraints: ConstraintNode[]
        getConstraint: <k extends ConstraintKind>(k: k) => ConstraintKinds[k]
        valueNode: ValueNode | undefined
        constrain<kind extends ConstraintKind>(
            kind: kind,
            input: ConstraintsInput[kind]
        ): PredicateNode
    }
>

export const PredicateNode = defineNodeKind<PredicateNode>(
    {
        kind: "predicate",
        compile: (rule) => {
            const subconditions: string[] = []
            for (const r of rule) {
                if (r.rule !== "true") {
                    subconditions.push(r.condition)
                }
            }
            // TODO: move || true to parent
            const condition = subconditions.join(" && ") || "true"
            return condition
        },
        intersect: (l, r): PredicateNode | Disjoint => {
            // if (
            //     // s.lastOperator === "&" &&
            //     rules.morphs?.some(
            //         (morph, i) => morph !== branch.tree.morphs?.[i]
            //     )
            // ) {
            //     throwParseError(
            //         writeImplicitNeverMessage(s.path, "Intersection", "of morphs")
            //     )
            // }
            const basis = l.basis
                ? r.basis
                    ? l.basis.intersect(r.basis)
                    : l.basis
                : r.basis
            if (basis instanceof Disjoint) {
                return basis
            }
            if (l.valueNode) {
                return r.allows(l.valueNode.rule)
                    ? l
                    : Disjoint.from("assignability", l.valueNode, r)
            }
            if (r.valueNode) {
                return l.allows(r.valueNode.rule)
                    ? r
                    : Disjoint.from("assignability", l, r.valueNode)
            }
            const rules: PredicateRules = basis ? [basis] : []
            for (const kind of constraintsByPrecedence) {
                const lNode = l.getConstraint(kind)
                const rNode = r.getConstraint(kind)
                if (lNode) {
                    if (rNode) {
                        const result = lNode.intersect(rNode as never)
                        // TODO: don't return here
                        if (result instanceof Disjoint) {
                            return result
                        }
                        rules.push(result)
                    } else {
                        rules.push(lNode)
                    }
                } else if (rNode) {
                    rules.push(rNode)
                }
            }
            return PredicateNode(rules)
        }
    },
    (base) => {
        const hasBasis = !!basisPrecedenceByKind[base.rule[0]?.kind as never]
        const basis = (hasBasis ? base.rule[0] : undefined) as
            | BasisNode
            | undefined
        const constraints = (
            basis ? base.rule.slice(1) : base.rule
        ) as ConstraintNode[]
        const description =
            base.rule.length === 0
                ? "unknown"
                : constraints.length
                ? constraints.map((rule) => rule.toString()).join(" and ")
                : `${basis}`
        return {
            description,
            basis,
            constraints,
            getConstraint: (k) =>
                constraints.find(
                    (constraint) => constraint.kind === k
                ) as never,
            valueNode: basis?.hasKind("value") ? basis : undefined,
            constrain(kind, input): PredicateNode {
                assertAllowsConstraint(this.basis, kind)
                const result = this.intersect(
                    // TODO: Fix createConstraint(kind, input)
                    PredicateNode([])
                )
                if (result instanceof Disjoint) {
                    return result.throw()
                }
                return result
            }
        }
    }
)

export const parsePredicateNode = (input: PredicateInput) => {
    const basis = input.basis && basisNodeFrom(input.basis)
    const rules: PredicateRules = basis ? [basis] : []
    for (const kind of constraintsByPrecedence) {
        if (input[kind]) {
            assertAllowsConstraint(basis, kind)
            // TODO: Create node kind
            // rules.push(createConstraint(kind, input[kind]))
        }
    }
    return PredicateNode(rules)
}

// compileTraverse(s: CompilationState) {
//     // let result constraint of this.rule) {
//     //     result= this.basis?.compileTraverse(s) ?? ""
//     // for (const  += "\n" + constraint.compileTraverse(s)
//     // }
//     s
//     return "true" //result
// }

// pruneDiscriminant(path: string[], kind: DiscriminantKind): PredicateNode {
//     if (path.length === 0) {
//         if (kind === "domain" && this.basis instanceof ValueNode) {
//             // if the basis specifies an exact value but was used to
//             // discriminate based on a domain, we can't prune it
//             return this
//         }
//         // create a new PredicateNode with the basis removed
//         return new PredicateNode(this.constraints)
//     }
//     const prunedProps = this.getConstraint("props")!.pruneDiscriminant(
//         path,
//         kind
//     )
//     const rules: PredicateRules = []
//     for (const rule of this.rule) {
//         if (rule.kind === "basis") {
//             if (rule.level !== "domain" || rule.domain !== "object") {
//                 rules.push(this.basis as never)
//             }
//         } else if (rule.kind === "props") {
//             if (prunedProps !== emptyPropsNode) {
//                 rules.push(prunedProps)
//             }
//         } else {
//             rules.push(rule)
//         }
//     }
//     return new PredicateNode(rules)
// }

// keyof() {
//     if (!this.basis) {
//         return neverTypeNode
//     }
//     const basisKey = this.basis.keyof()
//     const propsKey = this.getConstraint("props")?.keyof()
//     return propsKey?.or(basisKey) ?? basisKey
// }

export const assertAllowsConstraint = (
    basis: BasisNode | undefined,
    kind: ConstraintKind
) => {
    if (basis instanceof ValueNode) {
        if (kind !== "morph") {
            throwInvalidConstraintError(
                kind,
                "a non-literal type",
                basis.toString()
            )
        }
        return
    }

    const domain = basis?.domain ?? "unknown"

    switch (kind) {
        case "divisor":
            if (domain !== "number") {
                throwParseError(writeIndivisibleMessage(domain))
            }
            return
        case "range":
            if (domain !== "string" && domain !== "number") {
                const hasSizedClassBasis =
                    basis?.hasKind("class") && basis.extendsOneOf(Array, Date)
                if (!hasSizedClassBasis) {
                    throwParseError(writeUnboundableMessage(domain))
                }
            }
            return
        case "regex":
            if (domain !== "string") {
                throwInvalidConstraintError("regex", "a string", domain)
            }
            return
        case "props":
            if (domain !== "object") {
                throwInvalidConstraintError("props", "an object", domain)
            }
            return
        case "narrow":
            return
        case "morph":
            return
        default:
            throwInternalError(`Unexpxected rule kind '${kind}'`)
    }
}

export const writeInvalidConstraintMessage = (
    kind: ConstraintKind,
    typeMustBe: string,
    typeWas: string
) => {
    return `${kind} constraint may only be applied to ${typeMustBe} (was ${typeWas})`
}

export const throwInvalidConstraintError = (
    ...args: Parameters<typeof writeInvalidConstraintMessage>
) => throwParseError(writeInvalidConstraintMessage(...args))

const constraintsByPrecedence = [
    "divisor",
    "range",
    "regex",
    "props",
    "narrow",
    "morph"
] as const satisfies List<ConstraintKind>

const listableInputKinds = {
    regex: true,
    narrow: true,
    morph: true
} satisfies keySet<ConstraintKind>

type ListableInputKind = keyof typeof listableInputKinds

export const unknownPredicateNode = PredicateNode([])

export type PredicateRules = [BasisNode, ...ConstraintNode[]] | ConstraintNode[]

// export const constraintKinds = {
//     range: RangeNode,
//     divisor: DivisorNode,
//     regex: RegexNode,
//     props: PropsNode,
//     narrow: NarrowNode,
//     morph: MorphNode
// } as const

export type ConstraintNode = ConstraintKinds[ConstraintKind]

type ConstraintKinds = {
    range: RangeNode
    divisor: DivisorNode
    regex: RegexNode
    props: PropsNode
    narrow: NarrowNode
    morph: MorphNode
}

export type RuleKind = "basis" | ConstraintKind

export type ConstraintKind = keyof ConstraintKinds

export type PredicateInput<
    basis extends BasisInput | undefined = BasisInput | undefined
> = evaluate<
    {
        basis: basis
    } & ConstraintsInput<basis>
>

export type ConstraintsInput<
    basis extends BasisInput | undefined = BasisInput | undefined
> = BasisInput extends basis
    ? {
          [k in ConstraintKind]?: unknownConstraintInput<k>
      }
    : basis extends BasisInput
    ? constraintsOf<basis>
    : functionalConstraints<unknown>

type unknownConstraintInput<kind extends ConstraintKind> = kind extends "props"
    ? PropsInput
    :
          | ConstraintKinds[kind]["rule"]
          // Add the unlisted version as a valid input for these kinds
          | (kind extends ListableInputKind
                ? ConstraintKinds[kind]["rule"][number]
                : never)

export type inferPredicateDefinition<input extends PredicateInput> =
    input["morph"] extends Morph<any, infer out>
        ? (In: inferPredicateInput<input>) => Out<inferMorphOut<out>>
        : input["morph"] extends readonly [...any[], Morph<any, infer out>]
        ? (In: inferPredicateInput<input>) => Out<inferMorphOut<out>>
        : inferPredicateInput<input>

type inferPredicateInput<input extends PredicateInput> =
    input["narrow"] extends GuardedNarrow<any, infer narrowed>
        ? narrowed
        : input["narrow"] extends List<Narrow>
        ? inferNarrowArray<input["narrow"]> extends infer result
            ? isUnknown<result> extends true
                ? inferNonFunctionalConstraints<input>
                : result
            : never
        : inferNonFunctionalConstraints<input>

type inferNarrowArray<
    filters extends List,
    result = unknown
> = filters extends readonly [infer head, ...infer tail]
    ? inferNarrowArray<
          tail,
          result &
              (head extends GuardedNarrow<any, infer narrowed>
                  ? narrowed
                  : unknown)
      >
    : evaluate<result>

type inferNonFunctionalConstraints<input extends PredicateInput> =
    input["basis"] extends BasisInput
        ? input["props"] extends PropsInput
            ? inferPropsInput<input["props"]>
            : inferBasis<input["basis"]>
        : unknown

type constraintsOf<basis extends BasisInput> = basis extends Domain
    ? functionalConstraints<inferDomain<basis>> & domainConstraints<basis>
    : basis extends Constructor
    ? functionalConstraints<instanceOf<Constructor>> & classConstraints<basis>
    : basis extends readonly ["===", infer value]
    ? // Exact values cannot be filtered, but can be morphed
      Pick<functionalConstraints<value>, "morph">
    : never

type domainConstraints<basis extends Domain> = basis extends "object"
    ? {
          props?: PropsInput
      }
    : basis extends "string"
    ? {
          regex?: listable<string>
          range?: Range
      }
    : basis extends "number"
    ? {
          divisor?: number
          range?: Range
      }
    : {}

type functionalConstraints<input> = {
    narrow?: listable<Narrow<input>>
    morph?: listable<Morph<input>>
}

type classConstraints<base extends Constructor> = base extends typeof Array
    ? {
          props?: PropsInput
          range?: Range
      }
    : {
          props?: PropsInput
      }
