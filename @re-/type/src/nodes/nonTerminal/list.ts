import { Base } from "../base/index.js"
import { Expression } from "../parser/index.js"
import { Lex } from "../parser/lex.js"
import { Lexer } from "../parser/lexer.js"
import { BoundableNode } from "./bound/index.js"
import { NonTerminal } from "./nonTerminal.js"

export namespace List {
    export type Parse<S extends Expression.T.State> = Expression.T.From<{
        tree: Expression.T.Modify<S["tree"], "[]">
        scanner: Lex.ShiftToken<S["scanner"]["unscanned"]>
    }>

    export const parse = (s: Expression.State, ctx: Base.Parsing.Context) => {
        s.root = new ListNode(s.root!, ctx)
        Lexer.shiftOperator(s.scanner)
    }

    export const shiftToken = (scanner: Lexer.ValueScanner<"[">) => {
        if (scanner.next !== "]") {
            throw new Error(`Missing expected ].`)
        }
        scanner.shift()
    }

    export type Node<Child> = [Child, "[]"]
}

export class ListNode extends NonTerminal implements BoundableNode {
    toString() {
        return this.children.toString() + "[]"
    }

    allows(args: Base.Validation.Args) {
        if (!Array.isArray(args.value)) {
            this.addUnassignable(args)
            return false
        }
        let allItemsAllowed = true
        let itemIndex = 0
        for (const itemValue of args.value) {
            const itemIsAllowed = this.children.allows({
                ...args,
                value: itemValue,
                ctx: {
                    ...args.ctx,
                    path: Base.pathAdd(args.ctx.path, itemIndex)
                }
            })
            if (!itemIsAllowed) {
                allItemsAllowed = false
            }
            itemIndex++
        }
        return allItemsAllowed
    }

    generate() {
        return []
    }

    boundBy = "items"

    toBound(value: unknown[]) {
        return value.length
    }
}
