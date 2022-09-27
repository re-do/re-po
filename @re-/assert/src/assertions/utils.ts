import type { AssertionContext } from "../assert.js"
import { throwAssertionError } from "../assertions.js"

export const callAssertedFunction = (
    asserted: Function,
    ctx: AssertionContext
): AssertedFnCallResult => {
    const result: AssertedFnCallResult = {}
    try {
        result.returned = asserted(...ctx.assertedFnArgs)
    } catch (error) {
        result.threw = String(error)
    }
    return result
}

export const getThrownMessage = (
    result: AssertedFnCallResult,
    ctx: AssertionContext
) => {
    if (!("threw" in result)) {
        throwAssertionError({ message: "Function didn't throw.", ctx })
    }
    return result.threw
}

type AssertedFnCallResult = {
    returned?: unknown
    threw?: string
}

export const assertEqualOrMatching = (
    expected: unknown,
    actual: unknown,
    ctx: AssertionContext
) => {
    const assertionArgs = { actual, expected, ctx }
    if (typeof actual !== "string") {
        throwAssertionError({
            message: `Value was of type ${typeof actual} (expected a string).`,
            ...assertionArgs
        })
    } else if (typeof expected === "string") {
        if (!actual.includes(expected)) {
            throwAssertionError({
                message: `Expected string '${expected}' did not appear in actual string '${actual}'.`,
                ...assertionArgs
            })
        }
    } else if (expected instanceof RegExp) {
        if (!expected.test(actual)) {
            throwAssertionError({
                message: `Actual string '${actual}' did not match regex '${expected.source}'.`,
                ...assertionArgs
            })
        }
    } else {
        throw new Error(
            `Expected value for this assertion should be a string or RegExp.`
        )
    }
}
