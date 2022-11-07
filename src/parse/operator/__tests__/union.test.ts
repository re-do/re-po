import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { Operand } from "../../operand/operand.js"
import { Unenclosed } from "../../operand/unenclosed.js"
import type { Attributes } from "../../state/attributes.js"
import { discriminate } from "../../state/discriminate.js"

const testBranches: Attributes[] = [
    {
        type: "dictionary",
        props: {
            kind: {
                value: "1"
            }
        }
    },
    {
        type: "array",
        props: {
            kind: {
                value: "1"
            }
        }
    },
    {
        type: "dictionary",
        props: {
            kind: {
                value: "2"
            }
        }
    },
    {
        type: "array",
        props: {
            kind: {
                value: "2"
            }
        }
    }
]

// TODO: Prune empty branches

describe("union", () => {
    test("discriminate", () => {
        attest(discriminate(testBranches)).snap({
            path: "",
            key: "type",
            cases: {
                dictionary: {
                    branches: {
                        path: "kind",
                        key: "value",
                        cases: {
                            "1": { props: { kind: {} } },
                            "2": { props: { kind: {} } }
                        }
                    }
                },
                array: {
                    branches: {
                        path: "kind",
                        key: "value",
                        cases: {
                            "1": { props: { kind: {} } },
                            "2": { props: { kind: {} } }
                        }
                    }
                }
            }
        })
    })
    describe("infer", () => {
        test("two types", () => {
            attest(type("number|string").infer).typed as number | string
        })
        test("several types", () => {
            attest(type("false|null|undefined|0|''").infer).typed as
                | false
                | ""
                | 0
                | null
                | undefined
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                attest(() => type("number|strng")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("strng")
                )
            })
            test("consecutive tokens", () => {
                // @ts-expect-error
                attest(() => type("boolean||null")).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", "|null")
                )
            })
            test("ends with |", () => {
                // @ts-expect-error
                attest(() => type("boolean|")).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", "")
                )
            })
            test("long missing union member", () => {
                attest(() =>
                    // @ts-expect-error
                    type("boolean[]|(string|number|)|object")
                ).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", ")|object")
                )
            })
        })
    })
})
