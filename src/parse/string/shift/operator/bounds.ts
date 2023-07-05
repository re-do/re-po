import type { keySet } from "@arktype/utils"
import { isKeyOf } from "@arktype/utils"
import type {
    Comparator,
    MaxComparator
} from "../../../../nodes/primitive/bound.js"
import type { astToString } from "../../../ast/utils.js"
import type {
    DynamicState,
    DynamicStateWithRoot
} from "../../reduce/dynamic.js"
import type {
    LimitLiteral,
    writeUnpairableComparatorMessage
} from "../../reduce/shared.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { parseOperand } from "../operand/operand.js"
import type { Scanner } from "../scanner.js"

export const parseBound = (
    s: DynamicStateWithRoot,
    start: ComparatorStartChar
) => {
    const comparator = shiftComparator(s, start)
    const value = s.root.value?.rule
    if (typeof value === "number") {
        s.unsetRoot()
        return s.reduceLeftBound(`${value}`, comparator)
    } else if (value instanceof Date) {
        s.unsetRoot()
        const literal =
            s.root.value?.meta.parsedFrom ?? `d'${value.toISOString()}'`
        return s.reduceLeftBound(literal, comparator)
    }
    return parseRightBound(s, comparator)
}

export type parseBound<
    s extends StaticState,
    start extends ComparatorStartChar,
    unscanned extends string,
    $,
    args
> = shiftComparator<start, unscanned> extends infer shiftResultOrError
    ? shiftResultOrError extends Scanner.shiftResult<
          infer comparator extends Comparator,
          infer nextUnscanned
      >
        ? s["root"] extends LimitLiteral
            ? state.reduceLeftBound<s, s["root"], comparator, nextUnscanned>
            : parseRightBound<
                  state.scanTo<s, nextUnscanned>,
                  comparator,
                  $,
                  args
              >
        : shiftResultOrError
    : never

const oneCharComparators = {
    "<": true,
    ">": true
} as const

type OneCharComparator = keyof typeof oneCharComparators

export type ComparatorStartChar = Comparator extends `${infer char}${string}`
    ? char
    : never

export const comparatorStartChars: keySet<ComparatorStartChar> = {
    "<": true,
    ">": true,
    "=": true
}

const shiftComparator = (
    s: DynamicState,
    start: ComparatorStartChar
): Comparator =>
    s.scanner.lookaheadIs("=")
        ? `${start}${s.scanner.shift()}`
        : isKeyOf(start, oneCharComparators)
        ? start
        : s.error(singleEqualsMessage)

type shiftComparator<
    start extends ComparatorStartChar,
    unscanned extends string
> = unscanned extends `=${infer nextUnscanned}`
    ? [`${start}=`, nextUnscanned]
    : start extends OneCharComparator
    ? [start, unscanned]
    : state.error<singleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality`
type singleEqualsMessage = typeof singleEqualsMessage

// TODO: allow numeric limits for Dates?
export const parseRightBound = (
    s: DynamicStateWithRoot,
    comparator: Comparator
) => {
    // TODO: reenable
    s
    comparator
    // // store the node that will be bounded
    // const previousRoot = s.ejectRoot()
    // const previousScannerIndex = s.scanner.location
    // parseOperand(s)
    // // after parsing the next operand, use the locations to get the
    // // token from which it was parsed
    // const limitToken = s.scanner.sliceChars(
    //     previousScannerIndex,
    //     s.scanner.location
    // )
    // const limitNode = s.ejectRoot()
    // const limit = limitNode.value?.rule
    // if (typeof limit !== "number" && !(limit instanceof Date)) {
    //     return s.error(
    //         // use the reconstructed token for the invalid operand in the error message
    //         writeInvalidLimitMessage(comparator, limitToken, "right")
    //     )
    // }
    // if (!s.branches.range) {
    //     // apply the new bound to the previous root and restore it as the state's root
    //     s.setRoot(previousRoot.constrain("range", [{ comparator, limit }]))
    //     return
    // }
    // if (!isKeyOf(comparator, maxComparators)) {
    //     return s.error(writeUnpairableComparatorMessage(comparator))
    // }
    // const doubleBoundRange = s.branches.range.intersect(
    //     rangeNode([{ comparator, limit }])
    // )
    // if (doubleBoundRange instanceof Disjoint) {
    //     return doubleBoundRange.throw()
    // }
    // // remove the included left-bound from state
    // delete s.branches.range
    // // restore the previous root, now constrained by the newly parsed double-bounded Range
    // s.setRoot(previousRoot.constrain("range", doubleBoundRange.rule))
}

export type parseRightBound<
    s extends StaticState,
    comparator extends Comparator,
    $,
    args
> = parseOperand<s, $, args> extends infer nextState extends StaticState
    ? nextState["root"] extends LimitLiteral
        ? s["branches"]["leftBound"] extends {}
            ? comparator extends MaxComparator
                ? state.reduceRange<
                      s,
                      s["branches"]["leftBound"]["limit"],
                      s["branches"]["leftBound"]["comparator"],
                      comparator,
                      nextState["root"],
                      nextState["unscanned"]
                  >
                : state.error<writeUnpairableComparatorMessage<comparator>>
            : state.reduceSingleBound<
                  s,
                  comparator,
                  nextState["root"],
                  nextState["unscanned"]
              >
        : state.error<
              writeInvalidLimitMessage<
                  comparator,
                  astToString<nextState["root"]>,
                  "right"
              >
          >
    : never

export const writeInvalidLimitMessage = <
    comparator extends Comparator,
    limit extends string,
    boundKind extends BoundKind
>(
    comparator: comparator,
    limit: limit,
    boundKind: boundKind
): writeInvalidLimitMessage<comparator, limit, boundKind> =>
    `Comparator ${comparator} must be ${
        boundKind === "left" ? "preceded" : ("followed" as any)
    } by a corresponding literal (was '${limit}')`

export type writeInvalidLimitMessage<
    comparator extends Comparator,
    limit extends string,
    boundKind extends BoundKind
> = `Comparator ${comparator} must be ${boundKind extends "left"
    ? "preceded"
    : "followed"} by a corresponding literal (was '${limit}')`

export type BoundKind = "left" | "right"
