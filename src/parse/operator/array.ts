import type { DynamicState } from "../state/dynamic.js"
import type { Scanner } from "../state/scanner.js"
import type { state, StaticWithRoot } from "../state/static.js"

export const parseArray = (s: DynamicState) => {
    const next = s.scanner.shift()
    if (next !== "]") {
        return s.error(incompleteArrayTokenMessage)
    }
    s.morphRoot("array")
    return s
}

export type parseArray<
    s extends StaticWithRoot,
    unscanned extends string
> = unscanned extends Scanner.shift<"]", infer nextUnscanned>
    ? state.setRoot<s, [s["root"], "[]"], nextUnscanned>
    : state.error<incompleteArrayTokenMessage>

export const incompleteArrayTokenMessage = `Missing expected ']'`

type incompleteArrayTokenMessage = typeof incompleteArrayTokenMessage
