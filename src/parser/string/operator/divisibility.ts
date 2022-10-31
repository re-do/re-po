import { intersection } from "../../../attributes/intersection.js"
import { UnenclosedNumber } from "../operand/numeric.js"
import type { Scanner } from "../state/scanner.js"
import { State } from "../state/state.js"

export namespace DivisibilityOperator {
    export const parse = (s: State.DynamicWithRoot) => {
        const divisorToken = s.scanner.shiftUntilNextTerminator()
        return reduce(
            s,
            UnenclosedNumber.parseWellFormed(
                divisorToken,
                "integer",
                buildInvalidDivisorMessage(divisorToken)
            )
        )
    }

    export type parse<
        s extends State.StaticWithRoot,
        unscanned extends string
    > = Scanner.shiftUntil<
        unscanned,
        Scanner.TerminatingChar
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? reduce<
              s,
              UnenclosedNumber.parseWellFormedInteger<
                  scanned,
                  buildInvalidDivisorMessage<scanned>
              >,
              nextUnscanned
          >
        : never

    const reduce = (s: State.DynamicWithRoot, parseResult: number) => {
        if (parseResult === 0) {
            return State.error(buildInvalidDivisorMessage(0))
        }
        s.root = intersection(s.root, { divisor: parseResult })
        return s
    }

    type reduce<
        s extends State.StaticWithRoot,
        divisorOrError extends string | number,
        unscanned extends string
    > = divisorOrError extends number
        ? divisorOrError extends 0
            ? State.error<buildInvalidDivisorMessage<0>>
            : State.setRoot<s, [s["root"], "%", divisorOrError], unscanned>
        : State.error<`${divisorOrError}`>

    export const buildInvalidDivisorMessage = <divisor extends string | number>(
        divisor: divisor
    ): buildInvalidDivisorMessage<divisor> =>
        `% operator must be followed by a non-zero integer literal (was ${divisor})`

    type buildInvalidDivisorMessage<divisor extends string | number> =
        `% operator must be followed by a non-zero integer literal (was ${divisor})`
}
