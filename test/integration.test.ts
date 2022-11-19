import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"

describe("branch", () => {
    test("intersection parsed before union", () => {
        // Should be parsed as:
        // 1. "0" | ("1"&"2") | "3"
        // 2. "0" | never | "3"
        // 3. "0" | "3"
        const t = type("'0'|'1'&'2'|'3'")
        attest(t.infer).typed as "0" | "3"
        attest(t.attributes).snap({
            branches: ["?", "value", { "'0'": {}, "'3'": {} }]
        })
    })
})
