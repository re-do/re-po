import { strict } from "node:assert"
import { describe, test } from "mocha"
import { runThenGetContents } from "../../__tests__/utils.js"
import { fromHere, readFile } from "#runtime"

const benchTemplate = fromHere("benchTemplate.ts")
const expectedOutput = readFile(fromHere("benchExpectedOutput.ts"))

describe("bench", () => {
    test("populates file", () => {
        const actual = runThenGetContents(benchTemplate, {
            includeBenches: true,
            benchFormat: { noExternal: true }
        })
        strict.equal(actual, expectedOutput)
    }).timeout(30000)
})
