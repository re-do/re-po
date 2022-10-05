import { isKeyOf } from "@re-/tools"
import type { Base } from "../../../../nodes/common.js"
import { Bound } from "../../../../nodes/expression/bound.js"
import { PrimitiveLiteral } from "../../../../nodes/terminal/primitiveLiteral.js"
import type { Ast } from "../../../../nodes/traverse/ast.js"
import { UnenclosedNumber } from "../../operand/numeric.js"
import type { Scanner } from "../../state/scanner.js"
import { ParserState } from "../../state/state.js"
import { Comparators } from "./tokens.js"

export namespace RightBoundOperator {
    // TODO: Fix
    type BoundableNode = any

    export const parse = (s: ParserState.WithRoot, comparator: Bound.Token) => {
        const limitToken = s.scanner.shiftUntilNextTerminator()
        const limit = UnenclosedNumber.parseWellFormed(
            limitToken,
            buildInvalidLimitMessage(
                comparator,
                limitToken + s.scanner.unscanned
            ),
            "number"
        )
        return reduce(
            s,
            comparator,
            new PrimitiveLiteral.Node(
                limitToken as PrimitiveLiteral.Number,
                limit
            )
        )
    }

    export type parse<
        s extends ParserState.T.WithRoot,
        comparator extends Bound.Token
    > = Scanner.shiftUntilNextTerminator<
        s["unscanned"]
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? reduce<
              ParserState.scanTo<s, nextUnscanned>,
              comparator,
              scanned,
              UnenclosedNumber.ParseWellFormedNumber<
                  scanned,
                  buildInvalidLimitMessage<comparator, scanned>
              >
          >
        : never

    const reduce = (
        s: ParserState.WithRoot,
        comparator: Bound.Token,
        limit: PrimitiveLiteral.Node<number>
    ) =>
        isLeftBounded(s)
            ? reduceDouble(s, comparator, limit)
            : reduceSingle(s, comparator, limit)

    type reduce<
        s extends ParserState.T.WithRoot,
        comparator extends Bound.Token,
        limitToken extends string,
        limitParseResult extends string | number
    > = limitParseResult extends string
        ? ParserState.error<limitParseResult>
        : s["branches"]["leftBound"] extends {}
        ? reduceDouble<
              ParserState.from<{
                  root: ParserState.mergeIntersectionAndUnion<s>
                  branches: ParserState.initialBranches
                  groups: s["groups"]
                  unscanned: s["unscanned"]
              }>,
              s["branches"]["leftBound"][0],
              s["branches"]["leftBound"][1],
              comparator,
              limitToken & PrimitiveLiteral.Number
          >
        : reduceSingle<s, comparator, limitToken & PrimitiveLiteral.Number>

    const reduceDouble = (
        s: ParserState.Of<{
            root: Base.Node
            branches: {
                leftBound: ParserState.OpenLeftBound
            }
        }>,
        rightComparator: Bound.Token,
        rightLimit: PrimitiveLiteral.Node<number>
    ) => {
        if (!isBoundable(s)) {
            return ParserState.error(buildUnboundableMessage(s.root.toString()))
        }
        if (!isKeyOf(rightComparator, Bound.doubleTokens)) {
            return ParserState.error(
                Comparators.buildInvalidDoubleMessage(rightComparator)
            )
        }
        ParserState.mergeIntersectionAndUnion(s)
        s.root = new Bound.LeftNode(
            s.branches.leftBound[0],
            s.branches.leftBound[1],
            new Bound.RightNode(s.root, rightComparator, rightLimit)
        )
        s.branches.leftBound = undefined as any
        return s
    }

    type reduceDouble<
        s extends ParserState.T.WithRoot<BoundableNode>,
        leftLimit extends PrimitiveLiteral.Number,
        leftComparator extends Bound.Token,
        rightComparator extends Bound.Token,
        rightLimit extends PrimitiveLiteral.Number
    > = s["root"] extends BoundableNode
        ? rightComparator extends Bound.DoubleToken
            ? ParserState.setRoot<
                  s,
                  [
                      leftLimit,
                      leftComparator,
                      [s["root"], rightComparator, rightLimit]
                  ]
              >
            : ParserState.error<
                  Comparators.buildInvalidDoubleMessage<rightComparator>
              >
        : ParserState.error<buildUnboundableMessage<Ast.ToString<s["root"]>>>

    const reduceSingle = (
        s: ParserState.WithRoot<BoundableNode>,
        comparator: Bound.Token,
        limit: PrimitiveLiteral.Node<number>
    ) => {
        if (!isBoundable(s)) {
            return ParserState.error(buildUnboundableMessage(s.root.toString()))
        }
        s.root = new Bound.RightNode(s.root, comparator, limit)
        return s
    }

    type reduceSingle<
        s extends ParserState.T.WithRoot<BoundableNode>,
        comparator extends Bound.Token,
        limit extends PrimitiveLiteral.Number
    > = s["root"] extends BoundableNode
        ? ParserState.setRoot<s, [s["root"], comparator, limit]>
        : ParserState.error<buildUnboundableMessage<Ast.ToString<s["root"]>>>

    export const buildUnboundableMessage = <root extends string>(
        root: root
    ): buildUnboundableMessage<root> =>
        `Bounded expression '${root}' must be a number-or-string-typed keyword or an array-typed expression.`

    type buildUnboundableMessage<root extends string> =
        `Bounded expression '${root}' must be a number-or-string-typed keyword or an array-typed expression.`

    export const buildInvalidLimitMessage = <
        comparator extends Bound.Token,
        limit extends string
    >(
        comparator: comparator,
        limit: limit
    ): buildInvalidLimitMessage<comparator, limit> =>
        `Right comparator ${comparator} must be followed by a number literal (was '${limit}').`

    type buildInvalidLimitMessage<
        comparator extends Bound.Token,
        limit extends string
    > = `Right comparator ${comparator} must be followed by a number literal (was '${limit}').`

    const isBoundable = <s extends ParserState.WithRoot>(
        s: s
    ): s is s & ParserState.WithRoot<BoundableNode> => true

    const isLeftBounded = <s extends ParserState.Base>(
        s: s
    ): s is s & { branches: { leftBound: ParserState.OpenLeftBound } } =>
        !!s.branches.leftBound
}
