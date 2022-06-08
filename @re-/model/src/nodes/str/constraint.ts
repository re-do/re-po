import { Spliterate } from "@re-/tools"
import { EmbeddedNumber } from "./embedded.js"
import { Keyword } from "./keyword.js"
import { Str } from "./str.js"
import { Base } from "#base"

type Comparable = {
    [K in keyof Keyword.Types]: Keyword.Types[K] extends number | string
        ? K
        : never
}[keyof Keyword.Types]

type ComparatorToken = "<=" | ">=" | "<" | ">"

type InvalidBoundError<
    Inner extends string,
    Limit extends string
> = `'${Limit}' must be a number literal to bound '${Inner}'.`

type UnboundableError<Bounded extends string> =
    `Bounded definition '${Bounded}' must be a number or string keyword.`

const unboundableError = (inner: string) =>
    `Bounded definition '${Base.stringifyDef(
        inner
    )}' must be a number or string keyword.`

const constraintErrorTemplate =
    "Constraints must be either of the form N<L or L<N<L, where N is a constrainable type (e.g. number), L is a number literal (e.g. 5), and < is any comparison operator."

type ConstraintError = typeof constraintErrorTemplate

const buildComparatorErrorMessage = (
    comparatorError: string,
    value: string,
    bound: number,
    isString: boolean
) => {
    return `${Base.stringifyValue(value)} is ${comparatorError} ${bound}${
        isString ? " characters" : ""
    }.`
}

const comparators: {
    [K in ComparatorToken]: (
        value: string,
        comparable: number,
        bound: number,
        isString: boolean
    ) => string
} = {
    "<=": (value, comparable, bound, isString) =>
        comparable > bound
            ? buildComparatorErrorMessage(
                  "greater than",
                  value,
                  bound,
                  isString
              )
            : "",
    ">=": (value, comparable, bound, isString) =>
        comparable < bound
            ? buildComparatorErrorMessage("less than", value, bound, isString)
            : "",
    "<": (value, comparable, bound, isString) =>
        comparable >= bound
            ? buildComparatorErrorMessage(
                  "greater than or equal to",
                  value,
                  bound,
                  isString
              )
            : "",
    ">": (value, comparable, bound, isString) =>
        comparable <= bound
            ? buildComparatorErrorMessage(
                  "less than or equal to",
                  value,
                  bound,
                  isString
              )
            : ""
}

export namespace Constraint {
    export type Definition = `${string}${ComparatorToken}${string}`

    export type Parse<
        Def extends string,
        Dict,
        Ctx,
        Bounded extends string = ExtractBounded<Def>
    > = Bounded extends Base.ParseErrorMessage
        ? Bounded
        : Str.Parse<Bounded, Dict, Ctx>

    export type Validate<
        Def extends string,
        Dict,
        Root,
        Bounded extends string = ExtractBounded<Def>
    > = Bounded extends Base.ParseErrorMessage
        ? Bounded
        : Str.Validate<Bounded, Dict, Root>

    type SingleBoundedParts<
        Left extends string = string,
        Comparator extends ComparatorToken = ComparatorToken,
        Right extends string = string
    > = [Left, Comparator, Right]

    type DoubleBoundedParts<
        Left extends string = string,
        FirstComparator extends ComparatorToken = ComparatorToken,
        Middle extends string = string,
        SecondComparator extends ComparatorToken = ComparatorToken,
        Right extends string = string
    > = [Left, FirstComparator, Middle, SecondComparator, Right]

    type ExtractBounded<
        Def extends string,
        Parts = Spliterate<Def, ["<=", ">=", "<", ">"], true>
    > = Parts extends DoubleBoundedParts<
        infer Left,
        ComparatorToken,
        infer Middle,
        ComparatorToken,
        infer Right
    >
        ? Middle extends Comparable
            ? Left extends EmbeddedNumber.Definition
                ? Right extends EmbeddedNumber.Definition
                    ? Middle
                    : Base.ParseErrorMessage<InvalidBoundError<Middle, Right>>
                : Base.ParseErrorMessage<InvalidBoundError<Middle, Left>>
            : Base.ParseErrorMessage<UnboundableError<Middle>>
        : Parts extends SingleBoundedParts<
              infer Left,
              ComparatorToken,
              infer Right
          >
        ? Left extends Comparable
            ? Right extends EmbeddedNumber.Definition
                ? Left
                : Base.ParseErrorMessage<InvalidBoundError<Left, Right>>
            : Base.ParseErrorMessage<UnboundableError<Left>>
        : Base.ParseErrorMessage<ConstraintError>

    export const matcher = /(<=|>=|<|>)/

    export class Node extends Base.Node<Definition> {
        bounded() {
            return Str.parse(this.def.slice(0, -1), this.ctx)
        }

        allows(value: unknown, errors: Base.ErrorsByPath) {
            if (value !== undefined) {
                this.bounded().allows(value, errors)
            }
        }

        generate() {
            return undefined
        }
    }
}
