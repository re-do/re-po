import { AssertionError, strict } from "node:assert"
import { describe, test } from "mocha"
import { attest } from "../exports.ts"

const o = { ark: "type" }

describe("attest", () => {
    test("type toString", () => {
        attest(o).type.toString("{ ark: string; }")
        attest(o).type.toString.is("{ ark: string; }")
    })
    test("typed", () => {
        attest(o).typed as { ark: string }
    })
    test("equals", () => {
        attest(o).equals({ ark: "type" })
    })
    test("object", () => {
        attest({ i: "love my wife" }).typed as { i: string }
        strict.throws(
            () => attest({ g: "whiz" as unknown }).typed as { g: string },
            strict.AssertionError,
            "unknown"
        )
    })
    test("typed allows equivalent types", () => {
        const actual = { a: true, b: false }
        attest(actual).typed as {
            b: boolean
            a: boolean
        }
    })
    test("nonexistent types always fail", () => {
        // @ts-expect-error
        const nonexistent: NonExistent = {}
        strict.throws(
            () =>
                attest(nonexistent).typed as {
                    something: "specific"
                },
            AssertionError,
            "specific"
        )
    })
    test("functional asserts don't exist on pure value types", () => {
        // @ts-expect-error
        attest(5).throws
    })
    test("narrowedValue", () => {
        attest({ a: "narrow" } as { a: "narrow" }).narrowedValue({
            a: "narrow"
        })
        strict.throws(
            () => {
                attest({ a: "narrow" }).narrowedValue({ a: "narrow" })
            },
            AssertionError,
            "string"
        )
    })
})
