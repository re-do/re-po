import { attest, contextualize } from "@ark/attest"
import { parseJsonSchema } from "@ark/jsonschema"

// TODO: Add compound tests for strings (e.g. maxLength AND pattern)
// TODO: Add explicit test for negative length constraint failing (since explicitly mentioned in spec)

contextualize(() => {
	it("type string", () => {
		const t = parseJsonSchema({ type: "string" })
		attest<string>(t.infer)
		attest(t.json).snap({ domain: "string" })
	})

	it("maxLength", () => {
		const tMaxLength = parseJsonSchema({
			type: "string",
			maxLength: 5
		})
		attest<string>(tMaxLength.infer)
		attest(tMaxLength.json).snap({
			domain: "string",
			maxLength: 5
		})
	})

	it("minLength", () => {
		const tMinLength = parseJsonSchema({
			type: "string",
			minLength: 5
		})
		attest<string>(tMinLength.infer)
		attest(tMinLength.json).snap({
			domain: "string",
			minLength: 5
		})
	})

	it("pattern", () => {
		const tPatternString = parseJsonSchema({
			type: "string",
			pattern: "es"
		})
		attest<string>(tPatternString.infer)
		attest(tPatternString.json).snap({
			domain: "string",
			regex: ["es"]
		})
		// JSON Schema explicitly specifies that regexes MUST NOT be implicitly anchored
		// https://json-schema.org/draft-07/draft-handrews-json-schema-validation-01#rfc.section.4.3
		attest(tPatternString.allows("expression")).equals(true)

		const tPatternRegExp = parseJsonSchema({
			type: "string",
			pattern: /es/
		})
		attest<string>(tPatternRegExp.infer)
		attest(tPatternRegExp.json).snap({
			domain: "string",
			regex: ["es"] // strips the outer slashes
		})
		attest(tPatternRegExp.allows("expression")).equals(true)
	})
})
