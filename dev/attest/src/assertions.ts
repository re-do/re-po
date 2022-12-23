import { strict } from "node:assert"
import type { AssertionContext } from "./attest.ts"
import { isRecursible } from "./utils.ts"

export type ThrowAsertionErrorContext = {
    message: string
    expected?: unknown
    actual?: unknown
    ctx: AssertionContext
}

export const throwAssertionError = ({
    ctx,
    ...errorArgs
}: ThrowAsertionErrorContext): never => {
    const e = new strict.AssertionError(errorArgs)
    e.stack = ctx.assertionStack
    throw e
}

export const assertEquals = (
    expected: unknown,
    actual: unknown,
    ctx: AssertionContext
) => {
    if (expected === actual) {
        return
    }
    if (isRecursible(expected) && isRecursible(actual)) {
        try {
            strict.deepStrictEqual(actual, expected)
        } catch (e: any) {
            e.stack = ctx.assertionStack
            throw e
        }
    } else {
        // some nonsense to get a good stack trace
        try {
            strict.strictEqual(actual, expected)
        } catch (e: any) {
            e.stack = ctx.assertionStack
            throw e
        }
    }
}
