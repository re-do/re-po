import { attest, contextualize } from "@arktype/attest"
import { schemaScope } from "@arktype/schema"

contextualize(() => {
	it("reference", () => {
		const types = schemaScope({
			a: {
				domain: "object",
				prop: {
					key: "b",
					value: "$b"
				}
			},
			b: {
				domain: "string"
			}
		}).export()
		attest(types.a.json).snap({
			domain: "object",
			prop: [{ key: "b", value: "string" }]
		})
		attest(types.b.json).snap({ domain: "string" })
	})
	it("cyclic", () => {
		const types = schemaScope({
			a: {
				domain: "object",
				prop: {
					key: "b",
					value: "$b"
				}
			},
			b: {
				domain: "object",
				prop: {
					key: "a",
					value: "$a"
				}
			}
		}).export()

		attest(types.a.json).snap({
			domain: "object",
			prop: [
				{
					key: "b",
					value: { domain: "object", prop: [{ key: "a", value: "$a" }] }
				}
			]
		})

		attest(types.b.json).snap({
			domain: "object",
			prop: [{ key: "a", value: "$a" }]
		})

		const a = {} as { b: typeof b }
		const b = { a }
		a.b = b

		attest(types.a(a)).equals(a)
		attest(types.b({ a: { b: { a: { b: "whoops" } } } }).toString()).snap(
			"a.b.a.b must be an object (was string)"
		)
	})
})
