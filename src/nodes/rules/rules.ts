import { writeDoubleMorphIntersectionMessage } from "../../parse/string/ast.ts"
import type { Morph } from "../../parse/tuple/morph.ts"
import type { Narrow } from "../../parse/tuple/narrow.ts"
import type { ScopeRoot } from "../../scope.ts"
import { rootCheck } from "../../traverse/check.ts"
import type { Domain } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type {
    CollapsibleList,
    constructor,
    Dict
} from "../../utils/generics.ts"
import { listFrom } from "../../utils/generics.ts"
import { composeIntersection, composeKeyedIntersection } from "../compose.ts"
import type { TraversalEntry } from "../node.ts"
import { classIntersection } from "./class.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"
import { divisorIntersection } from "./divisor.ts"
import type {
    PropsRule,
    TraversalOptionalProps,
    TraversalRequiredProps
} from "./props.ts"
import { compileProps, propsIntersection } from "./props.ts"
import type { Range } from "./range.ts"
import { rangeIntersection } from "./range.ts"
import { getRegex, regexIntersection } from "./regex.ts"
import type { SubdomainRule, TraversalSubdomainRule } from "./subdomain.ts"
import { compileSubdomain, subdomainIntersection } from "./subdomain.ts"

export type Rules<domain extends Domain = Domain, $ = Dict> = {
    readonly subdomain?: SubdomainRule<$>
    readonly regex?: CollapsibleList<string>
    readonly divisor?: number
    readonly range?: Range
    readonly props?: PropsRule<$>
    readonly class?: constructor
    readonly narrow?: CollapsibleList<Narrow>
    readonly morph?: CollapsibleList<Morph>
}

export type RuleEntry =
    | ["subdomain", TraversalSubdomainRule]
    | ["regex", RegExp]
    | ["divisor", number]
    | ["range", Range]
    | ["class", constructor]
    | TraversalRequiredProps
    | TraversalOptionalProps
    | ["narrow", Narrow]
    // TODO: finalize how these fit into "Rules"
    | ["morph", Morph]
    | ["value", unknown]

export type RuleSet<domain extends Domain, $> = Domain extends domain
    ? Rules
    : domain extends "object"
    ? defineRuleSet<
          "object",
          "subdomain" | "props" | "range" | "narrow" | "class",
          $
      >
    : domain extends "string"
    ? defineRuleSet<"string", "regex" | "range" | "narrow", $>
    : domain extends "number"
    ? defineRuleSet<"number", "divisor" | "range" | "narrow", $>
    : defineRuleSet<domain, "narrow", $>

type defineRuleSet<domain extends Domain, keys extends keyof Rules, $> = Pick<
    Rules<domain, $>,
    keys
>

const narrowIntersection =
    composeIntersection<CollapsibleList<Narrow>>(collapsibleListUnion)

const morphIntersection = composeIntersection<CollapsibleList<Morph>>(
    (l, r, context) =>
        throwParseError(writeDoubleMorphIntersectionMessage(context.path))
)

export const rulesIntersection = composeKeyedIntersection<Rules>(
    {
        subdomain: subdomainIntersection,
        divisor: divisorIntersection,
        regex: regexIntersection,
        props: propsIntersection,
        class: classIntersection,
        range: rangeIntersection,
        narrow: narrowIntersection,
        morph: morphIntersection
    },
    { onEmpty: "bubble" }
)

export type FlattenAndPushRule<t> = (
    entries: RuleEntry[],
    rule: t,
    $: ScopeRoot
) => void

const ruleCompilers: {
    [k in keyof Rules]-?: FlattenAndPushRule<Rules[k] & {}>
} = {
    subdomain: compileSubdomain,
    regex: (entries, rule) => {
        for (const source of listFrom(rule)) {
            entries.push(["regex", getRegex(source)])
        }
    },
    divisor: (entries, rule) => {
        entries.push(["divisor", rule])
    },
    range: (entries, rule) => {
        entries.push(["range", rule])
    },
    class: (entries, rule) => {
        entries.push(["class", rule])
    },
    props: compileProps,
    narrow: (entries, rule) => {
        for (const narrow of listFrom(rule)) {
            entries.push(["narrow", narrow])
        }
    },
    morph: (entries, rule) => {
        for (const morph of listFrom(rule)) {
            entries.push(["morph", morph])
        }
    }
}
export const precedenceMap: {
    readonly [k in TraversalEntry[0]]: number
} = {
    // Critical: No other checks are performed if these fail
    domain: 0,
    value: 0,
    domains: 0,
    branches: 0,
    subdomain: 0,
    switch: 0,
    alias: 0,
    // Shallow: All shallow checks will be performed even if one or more fail
    class: 1,
    regex: 1,
    divisor: 1,
    range: 1,
    // Deep: Performed if all shallow checks pass, even if one or more deep checks fail
    requiredProps: 2,
    optionalProps: 2,
    // Narrow: Only performed if all shallow and deep checks pass
    narrow: 3,
    // Morph: Only performed if all validation passes
    morph: 4
}

export const compileRules = (rules: Rules, $: ScopeRoot): RuleEntry[] => {
    const entries: RuleEntry[] = []
    let k: keyof Rules
    for (k in rules) {
        ruleCompilers[k](entries, rules[k] as any, $)
    }
    return entries.sort((l, r) => precedenceMap[l[0]] - precedenceMap[r[0]])
}

export const literalSatisfiesRules = (
    data: unknown,
    rules: Rules,
    $: ScopeRoot
) => "data" in rootCheck(data, compileRules(rules, $), $, {})
