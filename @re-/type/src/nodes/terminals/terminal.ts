import { Base } from "../base.js"
import type { References } from "../references.js"
import type { Alias } from "./alias.js"
import type { Keyword } from "./keywords/keyword.js"
import type { RegexLiteralDefinition } from "./keywords/string.js"
import type {
    BigintLiteralDefinition,
    BooleanLiteralDefinition,
    NumberLiteralDefinition,
    StringLiteralDefinition
} from "./literal.js"

export type TerminalConstructorArgs<Definition extends string = string> = [
    definition: Definition,
    context: Base.context
]

export abstract class TerminalNode extends Base.node<string, string> {
    constructor(...[definition, context]: TerminalConstructorArgs) {
        super(definition, definition, context)
    }

    toString() {
        return this.definition
    }

    collectReferences(
        args: References.Options,
        collected: References.Collection
    ) {
        const reference = this.toString()
        if (!args.filter || args.filter(reference)) {
            collected[reference] = true
        }
    }
}

export type InferTerminal<
    Token extends string,
    Ctx extends Base.InferenceContext
> = Token extends Keyword.Definition
    ? Keyword.Types[Token]
    : Token extends keyof Ctx["Dict"]
    ? Alias.Infer<Token, Ctx>
    : Token extends StringLiteralDefinition<infer Value>
    ? Value
    : Token extends RegexLiteralDefinition
    ? string
    : Token extends NumberLiteralDefinition<infer Value>
    ? Value
    : Token extends BigintLiteralDefinition<infer Value>
    ? Value
    : Token extends BooleanLiteralDefinition<infer Value>
    ? Value
    : unknown
