import type { Keyword, Keywords } from "../../nodes/keywords.ts"
import type { BootstrapScope } from "../../scope.ts"
import type { asIn } from "../../type.ts"
import type { subdomainOf } from "../../utils/domains.ts"
import type {
    castOnError,
    Dict,
    downcast,
    Downcastable,
    equals,
    error,
    evaluate,
    extractValues,
    isAny,
    List,
    RegexLiteral,
    requiredKeyOf,
    stringKeyOf,
    tryCatch
} from "../../utils/generics.ts"
import { withPathContext } from "../../utils/paths"
import type { inferDefinition } from "../definition.ts"
import type { Out, ParsedMorph } from "../tuple/morph.ts"
import type { StringLiteral } from "./shift/operand/enclosed.ts"
import type { Scanner } from "./shift/scanner.ts"

export type inferAst<ast, $> = ast extends List
    ? ast[1] extends "[]"
        ? inferAst<ast[0], $>[]
        : ast[1] extends "|"
        ? inferUnion<
              inferAst<ast[0], $>,
              inferAst<ast[2], $>
          > extends infer result
            ? castOnError<result, never>
            : never
        : ast[1] extends "&"
        ? inferIntersection<
              inferAst<ast[0], $>,
              inferAst<ast[2], $>
          > extends infer result
            ? castOnError<result, never>
            : never
        : ast[1] extends Scanner.Comparator
        ? ast[0] extends number
            ? inferAst<ast[2], $>
            : inferAst<ast[0], $>
        : ast[1] extends "%"
        ? inferAst<ast[0], $>
        : never
    : inferTerminal<ast, $>

export type validateAstSemantics<ast, $> = ast extends string
    ? undefined
    : ast extends [infer child, unknown]
    ? validateAstSemantics<child, $>
    : ast extends [infer l, infer token, infer r]
    ? token extends "&"
        ? tryCatch<
              inferIntersection<inferAst<l, $>, inferAst<r, $>>,
              validateBinary<l, r, $>
          >
        : token extends "|"
        ? tryCatch<
              inferUnion<inferAst<l, $>, inferAst<r, $>>,
              validateBinary<l, r, $>
          >
        : token extends Scanner.Comparator
        ? l extends number
            ? validateAstSemantics<r, $>
            : isBoundable<inferAst<l, $>> extends true
            ? validateAstSemantics<l, $>
            : error<buildUnboundableMessage<astToString<ast[0]>>>
        : token extends "%"
        ? isDivisible<inferAst<l, $>> extends true
            ? validateAstSemantics<l, $>
            : error<buildIndivisibleMessage<astToString<ast[0]>>>
        : validateAstSemantics<l, $>
    : undefined

type validateBinary<l, r, $> = tryCatch<
    validateAstSemantics<l, $>,
    tryCatch<validateAstSemantics<r, $>, undefined>
>

export type inferIntersection<l, r> = inferIntersectionRecurse<l, r, []>

type inferIntersectionRecurse<
    l,
    r,
    path extends string[]
> = path["length"] extends 10
    ? l & r
    : l extends never
    ? never
    : r extends never
    ? never
    : l & r extends never
    ? error<buildImplicitNeverMessage<path>>
    : isAny<l | r> extends true
    ? any
    : l extends ParsedMorph<infer lIn, infer lOut>
    ? r extends ParsedMorph
        ? error<buildDoubleMorphIntersectionMessage<path>>
        : (In: evaluate<lIn & r>) => Out<lOut>
    : r extends ParsedMorph<infer rIn, infer rOut>
    ? (In: evaluate<rIn & l>) => Out<rOut>
    : [l, r] extends [Dict, Dict]
    ? bubblePropErrors<
          evaluate<
              {
                  [k in stringKeyOf<l>]: k extends keyof r
                      ? inferIntersectionRecurse<l[k], r[k], [...path, k]>
                      : l[k]
              } & Omit<r, keyof l>
          >
      >
    : [l, r] extends [List<infer lItem>, List<infer rItem>]
    ? inferIntersectionRecurse<
          lItem,
          rItem,
          [...path, "${number}"]
      > extends infer result
        ? tryCatch<result, result[]>
        : never
    : l & r

type bubblePropErrors<o> = extractValues<o, error> extends never
    ? o
    : extractValues<o, error>

export type inferUnion<l, r> = isAny<l | r> extends true
    ? any
    : [l] extends [never]
    ? r
    : [r] extends [never]
    ? l
    : [asIn<l>, asIn<r>] extends [infer lIn, infer rIn]
    ? [equals<l, lIn>, equals<r, rIn>] extends [true, true]
        ? l | r
        : discriminatable<lIn, rIn> extends true
        ? l | r
        : error<undiscriminatableMorphUnionMessage>
    : never

type discriminatable<l, r> = discriminatableRecurse<l, r, []> extends never
    ? false
    : true

type discriminatableRecurse<
    l,
    r,
    path extends string[]
> = path["length"] extends 10
    ? never
    : l & r extends never
    ? path
    : subdomainOf<l> & subdomainOf<r> extends never
    ? path
    : [subdomainOf<l>, subdomainOf<r>] extends ["object", "object"]
    ? extractValues<
          {
              [k in requiredKeyOf<l>]: k extends requiredKeyOf<r>
                  ? discriminatableRecurse<l[k], r[k], [...path, k & string]>
                  : never
          },
          string[]
      >
    : never

export const buildDoubleMorphIntersectionMessage = <path>(
    path: downcast<path>
): buildDoubleMorphIntersectionMessage<path> =>
    `${withPathContext(
        "Intersection",
        path
    )} must have at least one non-morph operand`

type buildDoubleMorphIntersectionMessage<path> = `${withPathContext<
    "Intersection",
    path
>} must have at least one non-morph operand`

export const undiscriminatableMorphUnionMessage = `A union of one or more morphs must be discriminatable`

export const buildImplicitNeverMessage = <path>(
    path: downcast<path>
): buildImplicitNeverMessage<path> =>
    `${withPathContext("Intersection", path)} results in an unsatisfiable type`

type buildImplicitNeverMessage<path> = `${withPathContext<
    "Intersection",
    path
>} results in an unsatisfiable type`

type undiscriminatableMorphUnionMessage =
    typeof undiscriminatableMorphUnionMessage

type isNonLiteralNumber<t> = t extends number
    ? number extends t
        ? true
        : false
    : false

type isNonLiteralString<t> = t extends string
    ? string extends t
        ? true
        : false
    : false

type isDivisible<data> = isAny<data> extends true
    ? true
    : isNonLiteralNumber<data>

type isBoundable<data> = isAny<data> extends true
    ? true
    : isNonLiteralNumber<data> extends true
    ? true
    : isNonLiteralString<data> extends true
    ? true
    : data extends List
    ? true
    : false

type inferTerminal<token, $> = token extends Keyword
    ? Keywords[token]
    : token extends keyof $
    ? $[token] extends BootstrapScope<infer def>
        ? // TODO: standardize tryCatch to deal with other types of defs like this
          isAny<$[token]> extends true
            ? any
            : $[token] extends never
            ? never
            : inferDefinition<def, $>
        : $[token]
    : token extends StringLiteral<infer Text>
    ? Text
    : token extends RegexLiteral
    ? string
    : token extends number | bigint
    ? token
    : never

export type astToString<ast, result extends string = ""> = ast extends [
    infer head,
    ...infer tail
]
    ? astToString<tail, `${result}${astToString<head>}`>
    : ast extends Downcastable
    ? `${result}${ast extends bigint ? `${ast}n` : ast}`
    : "..."

export const buildIndivisibleMessage = <root extends string>(
    root: root
): buildIndivisibleMessage<root> =>
    `Divisibility operand ${root} must be a non-literal number`

type buildIndivisibleMessage<root extends string> =
    `Divisibility operand ${root} must be a non-literal number`

export const buildUnboundableMessage = <root extends string>(
    root: root
): buildUnboundableMessage<root> =>
    `Bounded expression ${root} must be a non-literal number, string or array`

type buildUnboundableMessage<root extends string> =
    `Bounded expression ${root} must be a non-literal number, string or array`
