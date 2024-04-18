import { attest } from "@arktype/attest"
import { schema } from "@arktype/schema"
import { type } from "arktype"

it("builtin prototypes", () => {
	const a = type({
		age: "number"
	})

	const b = type({
		ages: a.array()
	})

	const c = schema(b.json as never)

	attest(b.json).equals(c.json)
})
