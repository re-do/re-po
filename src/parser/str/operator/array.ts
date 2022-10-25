import { Base } from "../../../nodes/base/base.js"
import { Arr } from "../../../nodes/expression/postfix/array.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState } from "../state/state.js"

export namespace ArrayOperator {
    export const parse = (s: ParserState.WithRoot) => {
        const next = s.scanner.shift()
        if (next !== "]") {
            throw new Error(incompleteTokenMessage)
        }
        s.attributes = new Base.Attributes({
            type: "array",
            values: s.attributes
        })
        s.root = new Arr.Node(s.root)
        return s
    }

    export type parse<
        s extends ParserState.T.WithRoot,
        unscanned extends string
    > = unscanned extends Scanner.shift<"]", infer remaining>
        ? ParserState.setRoot<s, [s["root"], "[]"], remaining>
        : ParserState.error<incompleteTokenMessage>

    export const incompleteTokenMessage = `Missing expected ']'.`

    type incompleteTokenMessage = typeof incompleteTokenMessage
}
