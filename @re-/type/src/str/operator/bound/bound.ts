import { Keyword } from "../../operand/index.js"
import {
    Comparator,
    comparatorToString,
    DoubleBoundComparator,
    invertedComparators,
    Node,
    NormalizedLowerBoundComparator,
    StrNode,
    strNode,
    unary
} from "./common.js"

export type BoundDefinition = [Comparator, number]

export type SingleBoundDefinition = [BoundDefinition]

export type DoubleBoundDefinition = [LowerBoundDefinition, UpperBoundDefinition]

export type LowerBoundDefinition = [NormalizedLowerBoundComparator, number]

export type UpperBoundDefinition = [DoubleBoundComparator, number]

export type BoundsDefinition = SingleBoundDefinition | DoubleBoundDefinition

export type Bound<
    Child = unknown,
    Bounds extends BoundsDefinition = BoundsDefinition
> = [Child, ...Bounds]

export class bound extends unary<boundableNode> {
    checkers: boundChecker[]

    constructor(
        child: boundableNode,
        public readonly bounds: BoundsDefinition,
        ctx: Node.context
    ) {
        super(child, ctx)
        this.checkers = bounds.map((bound) => createBoundChecker(bound))
    }

    get tree(): Bound<StrNode> {
        return [this.child.tree, ...this.bounds]
    }

    override toString() {
        const rightBoundToString =
            this.bounds.length === 1
                ? this.bounds[0].join("")
                : this.bounds[1].join("")
        let result = this.child.toString() + rightBoundToString
        if (this.bounds.length === 2) {
            const leftBoundToString = `${this.bounds[0][1]}${
                invertedComparators[this.bounds[0][0]]
            }`
            result = leftBoundToString + result
        }
        return result
    }

    allows(args: Node.Allows.Args) {
        if (!this.child.allows(args)) {
            return false
        }
        const size = this.child.checkSize(args.value)
        let boundIndex = 0
        for (const checker of this.checkers) {
            if (!checker(size)) {
                const [comparator, limit] = this.bounds[boundIndex]
                const units = this.child.units
                this.checkError(args, "BoundViolation", {
                    comparator,
                    limit,
                    size,
                    units,
                    message: boundViolationMessage(
                        args.value,
                        comparator,
                        limit,
                        units,
                        size
                    )
                })
                return false
            }
            boundIndex++
        }
        return true
    }

    create() {
        throw new Node.Create.UngeneratableError(
            this.toString(),
            "Bound generation is unsupported."
        )
    }
}

export type boundChecker = (y: number) => boolean

export const createBoundChecker = ([token, x]: BoundDefinition) => {
    switch (token) {
        case "<=":
            return (y: number) => y <= x
        case ">=":
            return (y: number) => y >= x
        case "<":
            return (y: number) => y < x
        case ">":
            return (y: number) => y > x
        case "==":
            return (y: number) => y === x
        default:
            throw new Error(`Unexpected comparator ${token}.`)
    }
}

/** A BoundableNode must be either:
 *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
 *    2. A string-typed keyword terminal (e.g. "alphanum" in "100<alphanum")
 *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
 */
export type BoundableNode =
    | Keyword.OfTypeNumber
    | Keyword.OfTypeString
    | [unknown, "[]"]

export interface boundableNode extends strNode {
    checkSize(value: unknown): number
    units?: BoundUnits
}

export type BoundableValue = number | string | unknown[]

export const isBoundable = (node: strNode): node is boundableNode =>
    "checkSize" in node

export type BoundUnits = "characters" | "items"

export type boundValidationError = Node.Allows.ErrorData<
    "BoundViolation",
    {
        comparator: Comparator
        limit: number
        size: number
        units?: BoundUnits
    }
>

export const boundViolationMessage = (
    value: unknown,
    comparator: Comparator,
    limit: number,
    units: BoundUnits | undefined,
    size: number
) =>
    `${Node.Allows.stringifyValue(value)} must be ${
        comparatorToString[comparator]
    } ${limit}${units ? " " + units : ""} (got ${size}).`
