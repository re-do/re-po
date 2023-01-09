import { describe, test } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("check errors", () => {
    test("divisible", () => {
        const t = type("number%2")
        const checked = t(3)
        attest(checked.problems?.summary).snap("3 is not divisible by 2.")
    })
    test("divisible", () => {
        const t = type("number%2")
        const checked = t(4)
        attest(checked).snap({ data: 4 })
    })
    test("string length", () => {
        const gte3 = type("string>=3")
        attest(gte3("yes").problems).equals(undefined)
    })

    test("range", () => {
        const t = type("number>2")

        //TODO separate tests
        const checked1 = t(2)
        attest(checked1.problems?.summary).snap(
            "Must be greater than 2 (got 2)."
        )

        const checked2 = t(3)
        attest(checked2.data).snap(3)
        attest(checked2.problems?.summary).equals(undefined)
    })
    test("domain", () => {
        const t = type("number>2")
        const checked = t("hellop")
        attest(checked.problems?.summary).snap(
            '"hellop" is not assignable to number.'
        )
    })
    test("regex", () => {
        const t = type("/\\w@hotmail.com/")
        const checked = t("shawn@hotail.com")
        attest(checked.problems?.summary).snap(
            '"shawn@hotail.com" must match expression /\\w@hotmail.com/.'
        )
    })
    test("required keys", () => {
        const t = type({
            name: "string",
            age: "number"
        })
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "requiredProps",
                [
                    ["name", "string"],
                    ["age", "number"]
                ]
            ]
        ])
        const checked = t({ name: "Shawn" })
        attest(checked.problems?.summary).snap("age: age is required.")
    })
})

describe("custom errors", () => {
    test("divisor", () => {
        const isEven = type("number%2", {
            problems: {
                DivisorViolation: {
                    message: ({ data, divisor }) =>
                        `${data} is not even. (${data}%${divisor})`
                }
            }
        })
        const check = isEven(3)
        attest(check.problems?.summary).snap("3 is not even. (3%2)")
    })
})
describe("unions", () => {
    test("union", () => {
        const basic = type("string|number[]")
        const check = basic(2)
        attest(check.problems?.summary).snap(
            "2 is not assignable to domains,[object Object]."
        )
    })
})
describe("", () => {
    test("tuple length", () => {
        const t = type(["string", "number", "string", "string[]"])
        attest(t.flat).snap([
            ["subdomain", "Array"],
            [
                "requiredProps",
                [
                    ["0", "string"],
                    ["1", "number"],
                    ["2", "string"],
                    ["3", [["subdomain", ["Array", "string"]]]]
                ]
            ]
        ])
        const checked = t(["hello"])
        attest(checked.problems?.summary).snap(
            "Tuple must have length 4 (got 1)."
        )
    })
})
describe("boop", () => {
    test("obj|obj", () => {
        const t = type([{ a: "number" }, "|", { c: "string" }])
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "branches",
                [
                    [["requiredProps", [["a", "number"]]]],
                    [["requiredProps", [["c", "string"]]]]
                ]
            ]
        ])
        const check = t({ a: "hello" })
        attest(check.problems?.summary).snap(
            'a: "hello" is not assignable to number.\nc: c is required.'
        )
    })
})
//union depth is a thing or something
