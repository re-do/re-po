import type { TypeNode } from "../nodes/node.ts"
import type { ScopeRoot } from "../scope.ts"
import type { domainOf, Primitive, Subdomain } from "../utils/domains.ts"
import { subdomainOf } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type {
    Dict,
    evaluate,
    isAny,
    isTopType,
    List
} from "../utils/generics.ts"
import type { inferRecord } from "./record.ts"
import { parseRecord } from "./record.ts"
import type { inferString, validateString } from "./string/string.ts"
import { parseString } from "./string/string.ts"
import type {
    inferTuple,
    UnknownTupleExpression,
    validateTupleExpression
} from "./tuple/tuple.ts"
import { parseTuple } from "./tuple/tuple.ts"

export const parseDefinition = (def: unknown, scope: ScopeRoot): TypeNode => {
    switch (subdomainOf(def)) {
        case "string":
            return parseString(def as string, scope)
        case "object":
            return parseRecord(def as Dict, scope)
        case "Array":
            return parseTuple(def as List, scope)
        case "RegExp":
            return { string: { regex: (def as RegExp).source } }
        default:
            return throwParseError(
                buildBadDefinitionTypeMessage(subdomainOf(def))
            )
    }
}

// TODO: Could this all just be called scope?
export type InferenceContext = {
    scope: Dict
    aliases?: unknown
    input?: true
}

export type inferDefinition<
    def,
    c extends InferenceContext
> = isTopType<def> extends true
    ? never
    : def extends string
    ? inferString<def, c>
    : def extends List
    ? inferTuple<def, c>
    : def extends RegExp
    ? string
    : def extends Dict
    ? inferRecord<def, c>
    : never

export type validateDefinition<
    def,
    c extends InferenceContext
> = isTopType<def> extends true
    ? buildUninferableDefinitionMessage<
          isAny<def> extends true ? "any" : "unknown"
      >
    : def extends []
    ? []
    : def extends string
    ? validateString<def, c>
    : def extends UnknownTupleExpression
    ? validateTupleExpression<def, c>
    : def extends RegExp
    ? def
    : def extends Primitive
    ? buildBadDefinitionTypeMessage<domainOf<def>>
    : def extends Function
    ? buildBadDefinitionTypeMessage<"Function">
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], c>
      }>

export type buildUninferableDefinitionMessage<
    typeName extends "any" | "unknown"
> =
    `Cannot statically parse a definition inferred as ${typeName}. Use 'type.dynamic(...)' instead.`

export const buildBadDefinitionTypeMessage = <actual extends Subdomain>(
    actual: actual
): buildBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

export type buildBadDefinitionTypeMessage<actual extends Subdomain> =
    `Type definitions must be strings or objects (was ${actual})`
