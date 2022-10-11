import { Base } from "../common.js"
import { Bound } from "./bound.js"
import type { Branching } from "./branching/branching.js"
import type { Divisibility } from "./divisibility.js"

export namespace Expression {
    export const tokens: Record<Token, 1> = {
        "?": 1,
        "[]": 1,
        "|": 1,
        "&": 1,
        "%": 1,
        ...Bound.tokens
    }

    export type Token = PostfixToken | BinaryToken

    export type PostfixToken = "[]" | "?"

    export type BinaryToken = ConstraintToken | Branching.Token

    export type ConstraintToken = Bound.Token | Divisibility.Token

    export type Tuple = readonly [left: unknown, token: Token, right?: unknown]

    type MappedChildren<Children extends Base.Node[]> = {
        [I in keyof Children]: unknown
    }

    // TODO: Can remove?
    export type LeftTypedAst = Bound.RightAst | Divisibility.Ast

    export type RightTypedAst = Bound.LeftAst

    export abstract class Node<
        Children extends Base.Node[],
        Tuple extends Expression.Tuple
    > extends Base.Node<Children> {
        abstract toTuple(
            ...childResults: MappedChildren<Children>
        ): Readonly<Tuple>

        get ast() {
            return this.toTuple(
                ...(this.children.map(
                    (child) => child.ast
                ) as MappedChildren<Children>)
            )
        }

        get definition() {
            return this.hasStructure
                ? this.toTuple(
                      ...(this.children.map(
                          (child) => child.definition
                      ) as MappedChildren<Children>)
                  )
                : this.toString()
        }
    }
}
