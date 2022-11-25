import type { DataTypeName } from "../utils/dataTypes.js"
import { hasDataType, hasObjectSubtype } from "../utils/dataTypes.js"
import type { evaluate, xor } from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import type { NumberAttributes } from "./number.js"
import type { ObjectAttributes } from "./object.js"
import type { StringAttributes } from "./string.js"

export type Node = xor<NodeTypes, DegenerateNode>

export type NodeTypes = {
    readonly bigint?: true | readonly IntegerLiteral[]
    readonly boolean?: true | readonly [boolean]
    readonly number?: true | readonly number[] | NumberAttributes
    readonly object?: true | ObjectAttributes
    readonly string?: true | readonly string[] | StringAttributes
    readonly symbol?: true
    readonly undefined?: true
    readonly null?: true
}

export type TypeName = evaluate<keyof NodeTypes>

export type DegenerateNode = Never | Any | Unknown | Alias

export type Never = { degenerate: "never"; reason: string }

export const isNever = (t: unknown): t is Never =>
    hasDataType(t, "object") &&
    hasObjectSubtype(t, "record") &&
    t.degenerate === "never"

export type Any = { degenerate: "any" }

export type Unknown = { degenerate: "unknown" }

export type Alias = { degenerate: "alias"; name: string }

export type Branches = UnionBranches | IntersectedUnions

export type UnionBranches = UndiscriminatedUnion | DiscriminatedUnion

export type UndiscriminatedUnion = readonly [token: "|", members: Node[]]

export type IntersectedUnions = readonly [token: "&", members: UnionBranches[]]

export type DiscriminatedUnion = readonly [
    token: "?",
    path: string,
    cases: DiscriminatedCases
]

type DiscriminatedCases = {
    readonly [k in DataTypeName]?: Node
}
