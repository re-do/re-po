import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testConstraint = () => {
    describe("type", () => {
        test("single-bounded", () => {
            assert(define("string>5").type).typed as string
        })
        test("double-bounded", () => {
            assert(define("-7<integer<99").type).typed as number
        })
        describe("errors", () => {
            test("invalid single bound", () => {
                // @ts-expect-error
                assert(() => define("number<integer")).throwsAndHasTypeError(
                    "'integer' must be a number literal to bound 'number'."
                )
            })
            test("invalid left bound", () => {
                // @ts-expect-error
                assert(() => define("null<number<5")).throwsAndHasTypeError(
                    "'null' must be a number literal to bound 'number'."
                )
            })
            test("invalid right bound", () => {
                // @ts-expect-error
                assert(() => define("1<number<string")).throwsAndHasTypeError(
                    "'string' must be a number literal to bound 'number'."
                )
            })
            test("two invalid bounds", () => {
                assert(() =>
                    // @ts-expect-error
                    define("number<number<number")
                ).throwsAndHasTypeError(
                    "'number' must be a number literal to bound 'number'."
                )
            })
            test("single-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => define("object<999")).throwsAndHasTypeError(
                    "Bounded definition 'object' must be a number or string keyword."
                )
            })
            test("double-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => define("1<object<999")).throwsAndHasTypeError(
                    "Bounded definition 'object' must be a number or string keyword."
                )
            })
            test("doubly invalid bounded unboundable", () => {
                // @ts-expect-error
                assert(() => define("null<object<true")).throwsAndHasTypeError(
                    "Bounded definition 'object' must be a number or string keyword."
                )
            })
            test("too many values", () => {
                // @ts-expect-error
                assert(() => define("1<2<number<4")).throwsAndHasTypeError(
                    "Constraints must be either of the form N<L or L<N<L, where N is a constrainable type (e.g. number), L is a number literal (e.g. 5), and < is any comparison operator."
                )
            })
        })
    })
    describe("validation", () => {
        test("string length", () => {
            assert(
                define("string>4").validate("longerThanFourCharacters").errors
            ).is(undefined)
            assert(define("string<4").validate("4").errors).is(undefined)
            assert(define("string<=4").validate("four").errors).is(undefined)
            assert(define("string<=4").validate("4").errors).is(undefined)
            assert(define("string>=4").validate("four").errors).is(undefined)
            assert(
                define("string>=4").validate("longerThanFourCharacters").errors
            ).is(undefined)
        })
        test("valid single-bounded", () => {
            assert(define("number>5").validate(7).errors).is(undefined)
            assert(define("number<-999").validate(-1000).errors).is(undefined)
            assert(define("number>=5").validate(5).errors).is(undefined)
            assert(define("number>=5").validate(9999).errors).is(undefined)
            assert(define("number<=-5").validate(-5).errors).is(undefined)
            assert(define("number<=-5").validate(-1000).errors).is(undefined)
        })
        test("valid double-bounded", () => {
            assert(define("5<number<10").validate(7).errors).is(undefined)
            assert(define("7>number>-2000").validate(-1000).errors).is(
                undefined
            )
            assert(define("5<=number<9999").validate(5).errors).is(undefined)
            assert(define("5<=number<9999").validate(9998).errors).is(undefined)
            assert(define("-5>=number>=-1000").validate(-5).errors).is(
                undefined
            )
            assert(define("-5>=number>=-1000").validate(-1000).errors).is(
                undefined
            )
        })
        describe("errors", () => {
            test("invalid string length", () => {
                assert(define("string>4").validate("four").errors).snap(
                    `"'four' was less than or equal to 4 characters."`
                )
                assert(define("string>4").validate("4").errors).snap(
                    `"'4' was less than or equal to 4 characters."`
                )
                assert(define("string<4").validate("four").errors).snap(
                    `"'four' was greater than or equal to 4 characters."`
                )
                assert(
                    define("string<4").validate("longerThanFourCharacters")
                        .errors
                ).snap(
                    `"'longerThanFourCharacters' was greater than or equal to 4 characters."`
                )
                assert(define("string>=4").validate("4").errors).snap(
                    `"'4' was less than 4 characters."`
                )
                assert(
                    define("string<=4").validate("longerThanFourCharacters")
                        .errors
                ).snap(
                    `"'longerThanFourCharacters' was greater than 4 characters."`
                )
            })
            test("single-bounded invalid", () => {
                assert(define("number<=5").validate(7).errors).snap(
                    `"7 was greater than 5."`
                )
                assert(define("number>=-999").validate(-1000).errors).snap(
                    `"-1000 was less than -999."`
                )
                assert(define("number<5").validate(5).errors).snap(
                    `"5 was greater than or equal to 5."`
                )
                assert(define("number<5").validate(9999).errors).snap(
                    `"9999 was greater than or equal to 5."`
                )
                assert(define("number>-5").validate(-5).errors).snap(
                    `"-5 was less than or equal to -5."`
                )
                assert(define("number>-5").validate(-1000).errors).snap(
                    `"-1000 was less than or equal to -5."`
                )
            })
            test("double-bounded invalid", () => {
                assert(define("5<number<10").validate(-9).errors).snap(
                    `"-9 was less than or equal to 5."`
                )
                assert(define("5<number<10").validate(99).errors).snap(
                    `"99 was greater than or equal to 10."`
                )
                assert(define("7>number>-2000").validate(-3000).errors).snap(
                    `"-3000 was less than or equal to -2000."`
                )
                assert(define("7>number>-2000").validate(3000).errors).snap(
                    `"3000 was greater than or equal to 7."`
                )
                assert(define("5<=number<9999").validate(9999).errors).snap(
                    `"9999 was greater than or equal to 9999."`
                )
                assert(define("5<=number<9999").validate(10000).errors).snap(
                    `"10000 was greater than or equal to 9999."`
                )
                assert(define("5<=number<9999").validate(4).errors).snap(
                    `"4 was less than 5."`
                )
                assert(define("-5>=number>=-1000").validate(0).errors).snap(
                    `"0 was greater than -5."`
                )
                assert(define("-5>=number>=-1000").validate(-1001).errors).snap(
                    `"-1001 was less than -1000."`
                )
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => define("1<number<5").generate()).throws.snap(
                `"Unable to generate a value for '1<number<5' (generation with constraints is unsupported)."`
            )
        })
    })
}
