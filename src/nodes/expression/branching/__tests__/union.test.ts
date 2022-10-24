import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { assert } from "#testing"

describe("union node", () => {
    describe("check", () => {
        test("two types", () => {
            assert(type("true|false").check(false).problems).is(undefined)
        })
        test("several types", () => {
            assert(
                type("0|false|undefined|null|'zero'|void").check("zero")
                    .problems
            ).is(undefined)
        })
        describe("errors", () => {
            test("two types", () => {
                assert(
                    type("'yes'|'no'").check("maybe").problems?.summary
                ).snap(`Must be one of 'yes'|'no' (was "maybe")`)
            })
            test("several types", () => {
                assert(type("2|4|6|8").check(5).problems?.summary).snap(
                    `Must be one of 2|4|6|8 (was 5)`
                )
            })
            // TODO: Reenable
            //             test("explainBranches", () => {
            //                 assert(
            //                     space(
            //                         {
            //                             a: "b|c",
            //                             b: "d|e",
            //                             c: "f|g",
            //                             d: "0",
            //                             e: "1",
            //                             f: "2",
            //                             g: "3"
            //                         },
            //                         {
            //                             errors: { union: { explainBranches: true } }
            //                         }
            //                     ).a.check(4).problems?.summary
            //                 ).snap(`Must be one of b|c (was 4):
            // b: Must be one of d|e (was 4):
            // d: Must be 0 (was 4)
            // e: Must be 1 (was 4)
            // c: Must be one of f|g (was 4):
            // f: Must be 2 (was 4)
            // g: Must be 3 (was 4)`)
            //             })
        })
    })
})
