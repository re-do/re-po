import { attest, caller, getArgTypesAtPosition } from "@arktype/attest"
import { describe, test } from "mocha"

const attestInternal = () => getArgTypesAtPosition(caller())

describe("lib", () => {
	test("getArgTypesAtPosition", () => {
		// Any changes above here could break assertion positions
		attest(attestInternal()).snap({
			location: { start: { line: 9, char: 3 }, end: { line: 9, char: 27 } },
			args: [
				{
					type: "SerializedAssertionData",
					relationships: { args: ["equality"], typeArgs: [] }
				}
			],
			typeArgs: [],
			errors: []
		})
	})
})
