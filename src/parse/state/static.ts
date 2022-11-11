import type { defined } from "../../utils/generics.js"
import type {
    buildUnmatchedGroupCloseMessage,
    parseError,
    unclosedGroupMessage
} from "../errors.js"
import type {
    buildOpenRangeMessage,
    OpenRange
} from "../operator/bounds/left.js"
import type { Scanner } from "./scanner.js"

export type StaticState = {
    root: unknown
    branches: BranchState
    groups: BranchState[]
    unscanned: string
}

type BranchState = {
    range: OpenRange | undefined
    "&": unknown
    "|": unknown
}

export namespace state {
    export type initialize<def extends string> = from<{
        root: undefined
        branches: initialBranches
        groups: []
        unscanned: def
    }>

    type initialBranches = branchesFrom<{
        range: undefined
        "&": undefined
        "|": undefined
    }>

    export type setRoot<
        s extends StaticState,
        root,
        unscanned extends string
    > = from<{
        root: root
        branches: s["branches"]
        groups: s["groups"]
        unscanned: unscanned
    }>

    export type reduceBranch<
        s extends StaticState,
        token extends Scanner.BranchToken,
        unscanned extends string
    > = s["branches"]["range"] extends {}
        ? openRangeError<s["branches"]["range"]>
        : from<{
              root: undefined
              branches: token extends "&"
                  ? branchIntersection<s["branches"], s["root"]>
                  : branchUnion<s["branches"], s["root"]>
              groups: s["groups"]
              unscanned: unscanned
          }>

    type branchIntersection<branches extends BranchState, root> = branchesFrom<{
        range: undefined
        "&": pushIntersection<branches["&"], root>
        "|": branches["|"]
    }>

    type branchUnion<branches extends BranchState, root> = branchesFrom<{
        range: undefined
        "&": undefined
        "|": pushUnion<branches["|"], branches["&"], root>
    }>

    export type reduceOpenRange<
        s extends StaticState,
        limit extends number,
        comparator extends Scanner.PairableComparator
    > = from<{
        root: undefined
        branches: {
            range: [limit, comparator]
            "&": s["branches"]["&"]
            "|": s["branches"]["|"]
        }
        groups: s["groups"]
        unscanned: s["unscanned"]
    }>

    export type finalizeRange<
        s extends StaticState,
        leftLimit extends number,
        leftComparator extends Scanner.PairableComparator,
        rightComparator extends Scanner.PairableComparator,
        rightLimit extends number,
        unscanned extends string
    > = state.from<{
        root: [
            leftLimit,
            leftComparator,
            [s["root"], rightComparator, rightLimit]
        ]
        branches: {
            range: undefined
            "&": s["branches"]["&"]
            "|": s["branches"]["|"]
        }
        groups: s["groups"]
        unscanned: unscanned
    }>

    export type reduceSingleBound<
        s extends StaticState,
        limit extends number,
        comparator extends Scanner.Comparator,
        unscanned extends string
    > = state.from<{
        root: [s["root"], comparator, limit]
        branches: {
            range: undefined
            "&": s["branches"]["&"]
            "|": s["branches"]["|"]
        }
        groups: s["groups"]
        unscanned: unscanned
    }>

    type pushUnion<unionState, intersectionState, root> =
        unionState extends undefined
            ? pushIntersection<intersectionState, root>
            : [unionState, "|", pushIntersection<intersectionState, root>]

    type pushIntersection<intersectionState, root> =
        intersectionState extends undefined
            ? root
            : [intersectionState, "&", root]

    type popGroup<stack extends BranchState[], top extends BranchState> = [
        ...stack,
        top
    ]

    export type finalizeGroup<
        s extends StaticState,
        unscanned extends string
    > = s["groups"] extends popGroup<infer stack, infer top>
        ? from<{
              groups: stack
              branches: top
              root: pushUnion<s["branches"]["|"], s["branches"]["&"], s["root"]>
              unscanned: unscanned
          }>
        : error<buildUnmatchedGroupCloseMessage<s["unscanned"]>>

    export type reduceGroupOpen<
        s extends StaticState,
        unscanned extends string
    > = from<{
        groups: [...s["groups"], s["branches"]]
        branches: initialBranches
        root: undefined
        unscanned: unscanned
    }>

    export type finalize<s extends StaticState> =
        s["root"] extends parseError<string>
            ? s
            : s["groups"] extends []
            ? s["branches"]["range"] extends {}
                ? openRangeError<s["branches"]["range"]>
                : from<{
                      root: pushUnion<
                          s["branches"]["|"],
                          s["branches"]["&"],
                          s["root"]
                      >
                      groups: s["groups"]
                      branches: initialBranches
                      unscanned: Scanner.finalized
                  }>
            : error<unclosedGroupMessage>

    export type error<message extends string> = from<{
        root: parseError<message>
        branches: initialBranches
        groups: []
        unscanned: Scanner.finalized
    }>

    type openRangeError<range extends defined<BranchState["range"]>> = error<
        buildOpenRangeMessage<range[0], range[1]>
    >

    export type previousOperator<s extends StaticState> =
        s["branches"]["range"] extends {}
            ? s["branches"]["range"][1]
            : s["branches"]["&"] extends {}
            ? "&"
            : s["branches"]["|"] extends {}
            ? "|"
            : undefined

    export type scanTo<
        state extends StaticState,
        unscanned extends string
    > = from<{
        root: state["root"]
        branches: state["branches"]
        groups: state["groups"]
        unscanned: unscanned
    }>

    export type from<s extends StaticState> = s

    export type branchesFrom<b extends BranchState> = b
}
