import { attest, contextualize } from "@ark/attest"
import {
	registeredReference,
	writeNonPrimitiveNonFunctionDefaultValueMessage,
	writeUnassignableDefaultValueMessage
} from "@ark/schema"
import type { Primitive } from "@ark/util"
import { scope, type } from "arktype"
import type { Date } from "arktype/internal/keywords/constructors/Date.ts"
import type {
	InferredDefault,
	Out,
	string
} from "arktype/internal/keywords/inference.ts"
import { writeNonLiteralDefaultMessage } from "arktype/internal/parser/shift/operator/default.ts"

contextualize(() => {
	describe("parsing and traversal", () => {
		it("base", () => {
			const fn5 = () => 5 as const
			const o = type({
				a: "string",
				foo: "number = 5",
				bar: ["number", "=", 5],
				baz: ["number", "=", fn5]
			})
			const fn5reg = registeredReference(fn5)

			// ensure type ast displays is exactly as expected
			attest(o.t).type.toString.snap(`{
	a: string
	foo: defaultsTo<5>
	bar: defaultsTo<5>
	baz: defaultsTo<() => 5>
}`)
			attest<{ a: string; foo?: number; bar?: number; baz?: number }>(o.inferIn)
			attest<{ a: string; foo: number; bar: number; baz: number }>(o.infer)

			attest(o.json).snap({
				required: [{ key: "a", value: "string" }],
				optional: [
					{
						default: fn5reg,
						key: "baz",
						value: { domain: "number", meta: { default: fn5reg } }
					},
					{
						default: 5,
						key: "bar",
						value: { domain: "number", meta: { default: 5 } }
					},
					{
						default: 5,
						key: "foo",
						value: { domain: "number", meta: { default: 5 } }
					}
				],
				domain: "object"
			})

			attest(o({ a: "", foo: 4, bar: 4, baz: 4 })).equals({
				a: "",
				foo: 4,
				bar: 4,
				baz: 4
			})
			attest(o({ a: "" })).equals({ a: "", foo: 5, bar: 5, baz: 5 })
			attest(o({ bar: 4 }).toString()).snap("a must be a string (was missing)")
			attest(o({ a: "", bar: "" }).toString()).snap(
				"bar must be a number (was a string)"
			)
		})

		it("defined with wrong type", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", bar: ["number", "=", "5"] })
			)
				.throws(
					writeUnassignableDefaultValueMessage(
						"must be a number (was a string)"
					)
				)
				.type.errors.snap(
					"Type 'string' is not assignable to type 'number | (() => number)'."
				)
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", bar: ["number", "=", () => "5"] })
			)
				.throws(
					writeUnassignableDefaultValueMessage(
						"must be a number (was a string)"
					)
				)
				.type.errors.snap(
					"Type '() => string' is not assignable to type 'number | (() => number)'.Type '() => string' is not assignable to type '() => number'.Type 'string' is not assignable to type 'number'."
				)
		})

		it("validated default in scope", () => {
			const types = scope({
				specialNumber: "number",
				stringDefault: { foo: "string", bar: "specialNumber = 5" },
				tupleDefault: { foo: "string", bar: ["specialNumber", "=", 5] }
			}).export()

			attest<{
				foo: string
				bar: InferredDefault<number, 5>
			}>(types.stringDefault.t)

			attest<typeof types.stringDefault.t>(types.tupleDefault.t)

			attest(types.stringDefault.json).snap({
				required: [{ key: "foo", value: "string" }],
				optional: [
					{
						default: 5,
						key: "bar",
						value: { domain: "number", meta: { default: 5 } }
					}
				],
				domain: "object"
			})

			attest(types.tupleDefault.json).equals(types.stringDefault.json)
		})

		it("chained", () => {
			const defaultedString = type("string").default("")
			attest(defaultedString.t).type.toString.snap('defaultsTo<"">')
			attest(defaultedString.json).snap({
				domain: "string",
				meta: { default: "" }
			})

			const o = type({ a: defaultedString })
			attest(o.t).type.toString.snap('{ a: defaultsTo<""> }')
			attest<{ a?: string }>(o.inferIn)
			attest<{ a: string }>(o.infer)
			attest(o.json).snap({
				optional: [
					{
						default: "",
						key: "a",
						value: { domain: "string", meta: { default: "" } }
					}
				],
				domain: "object"
			})
		})

		it("invalid chained", () => {
			// @ts-expect-error
			attest(() => type("number").default(true))
				.throws(
					writeUnassignableDefaultValueMessage("must be a number (was boolean)")
				)
				.type.errors(
					"'boolean' is not assignable to parameter of type 'number | (() => number)'"
				)
		})

		it("spread", () => {
			const t = type("number", "=", 5)

			const expected = type(["number", "=", 5])
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("invalid spread", () => {
			// @ts-expect-error
			attest(() => type("number", "=", true))
				.throws(
					writeUnassignableDefaultValueMessage("must be a number (was boolean)")
				)
				.type.errors(
					"'boolean' is not assignable to parameter of type 'number | (() => number)'"
				)
		})

		it("morphed", () => {
			// https://discord.com/channels/957797212103016458/1280932672029593811/1283368602355109920
			const processForm = type({
				bool_value: type("string")
					.pipe(v => (v === "on" ? true : false))
					.default("off")
			})

			attest<{
				bool_value: (In: string.defaultsTo<"off">) => Out<boolean>
			}>(processForm.t)

			const out = processForm({})

			attest(out).snap({ bool_value: false })

			attest(processForm({ bool_value: "on" })).snap({ bool_value: true })

			attest(processForm({ bool_value: true }).toString()).snap(
				"bool_value must be a string (was boolean)"
			)
		})

		it("morphed from defaulted", () => {
			const processForm = type({
				bool_value: type("string='off'").pipe(v => (v === "on" ? true : false))
			})

			attest<{
				bool_value: (In: string.defaultsTo<"off">) => Out<boolean>
			}>(processForm.t)

			const out = processForm({})

			attest(out).snap({ bool_value: false })

			attest(processForm({ bool_value: "on" })).snap({ bool_value: true })

			attest(processForm({ bool_value: true }).toString()).snap(
				"bool_value must be a string (was boolean)"
			)
		})
	})

	describe("string parsing", () => {
		it("number", () => {
			const t = type({ key: "number = 42" })
			const expected = type({ key: ["number", "=", 42] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("bigint", () => {
			const t = type({ key: "bigint = 100n" })
			const expected = type({ key: ["bigint", "=", 100n] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("string", () => {
			const t = type({ key: 'string = "default value"' })
			const expected = type({ key: ["string", "=", "default value"] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("Date", () => {
			const t = type({ key: 'Date = d"1993-05-21"' })

			const out = t.assert({})

			// pass the same date instance back
			const expected = type({ key: ["Date", "=", () => out.key] })

			// we can't check expected here since the Date instance will not
			// have a narrowed literal type
			attest<{
				key: InferredDefault<Date, Date.literal<"1993-05-21">>
			}>(t.t)
			// attest(t.json).equals(expected.json)
		})

		it("Date is immutable", () => {
			const t = type({ date: 'Date = d"1993-05-21"' })
			const v1 = t.assert({})
			const time = v1.date.getTime()
			v1.date.setMilliseconds(123)
			const v2 = t.assert({})
			attest(v2.date.getTime()).equals(time)
		})

		it("true", () => {
			const t = type({ key: "boolean = true" })
			const expected = type({ key: ["boolean", "=", true] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("false", () => {
			const t = type({ key: "boolean = false" })
			const expected = type({ key: ["boolean", "=", false] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("null", () => {
			const t = type({ key: "object | null = null" })
			const expected = type({ key: ["object | null", "=", null] })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("undefined", () => {
			const t = type({ key: "unknown = undefined" })
			const expected = type({ key: ["unknown", "=", undefined] })

			attest(t({})).snap({ key: undefined })

			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("incorrect default type", () => {
			// @ts-expect-error
			attest(() => type({ foo: "string", bar: "number = true" }))
				.throws(
					writeUnassignableDefaultValueMessage("must be a number (was boolean)")
				)
				.type.errors("true is not assignable to number")
		})

		it("non-literal", () => {
			attest(() =>
				// @ts-expect-error
				type({ foo: "string", bar: "unknown = number" })
			).throwsAndHasTypeError(writeNonLiteralDefaultMessage("number"))
		})

		it("validated default in scope", () => {
			const $ = scope({
				specialNumber: "number",
				obj: { foo: "string", bar: "specialNumber = 5" }
			})

			$.export()

			attest($.json).snap({
				specialNumber: { domain: "number" },
				obj: {
					required: [{ key: "foo", value: "string" }],
					optional: [
						{
							default: 5,
							key: "bar",
							value: { domain: "number", meta: { default: 5 } }
						}
					],
					domain: "object"
				}
			})
		})

		it("optional with default", () => {
			const t = type({ foo: "string", "bar?": "number = 5" })
			attest<{
				foo: string
				bar?: number
			}>(t.inferIn)
			attest<{
				foo: string
				bar?: number
			}>(t.infer)

			const fromTuple = type({ foo: "string", "bar?": ["number", "=", 5] })
			attest<typeof t.t>(fromTuple.t)
			attest(fromTuple.json).equals(t.json)
		})

		it("shallow default", () => {
			const t = type("string='foo'")
			const expected = type("string").default("foo")
			attest<typeof expected.t>(t.t)
			attest(t.json).equals(expected.json)
		})
	})

	describe("works properly with types", () => {
		it("allows primitives and factories for anys", () => {
			const fn = () => {}
			const t = type({
				foo1: ["unknown", "=", true],
				bar1: ["unknown", "=", () => [true]],
				baz1: ["unknown", "=", () => fn],
				foo2: ["unknown.any", "=", true],
				bar2: ["unknown.any", "=", () => [true]],
				baz2: ["unknown.any", "=", () => fn]
			})
			const v = t.assert({})
			attest(v).snap({
				foo1: true,
				bar1: [true],
				baz1: fn,
				foo2: true,
				bar2: [true],
				baz2: fn
			})
		})
		it("disallows plain objects for anys", () => {
			attest(() => {
				// @ts-expect-error
				type({ foo: ["unknown", "=", { foo: "bar" }] })
			})
				.throws("is not primitive")
				.type.errors("'foo' does not exist in type '() => unknown'.")
			attest(() => {
				// @ts-expect-error
				type({ foo: ["unknown.any", "=", { foo: "bar" }] })
			})
				.throws("is not primitive")
				.type.errors("'foo' does not exist in type '() => any'.")
		})

		it("allows string sybtyping", () => {
			type({
				foo: [/^foo/ as type.cast<`foo${string}`>, "=", "foobar"],
				bar: [/bar$/ as type.cast<`${string}bar`>, "=", () => "foobar" as const]
			})
		})

		it("shows types plainly", () => {
			attest(
				// @ts-expect-error
				() => type({ foo: ["number", "=", true] })
			)
				.throws()
				.type.errors.snap(
					"Type 'boolean' is not assignable to type 'number | (() => number)'."
				)
			attest(
				// @ts-expect-error
				() => type({ foo: ["number[]", "=", true] })
			)
				.throws()
				.type.errors.snap(
					"Type 'boolean' is not assignable to type '() => number[]'."
				)
			attest(
				// @ts-expect-error
				() => type({ foo: [{ bar: "false" }, "=", true] })
			)
				.throws()
				.type.errors.snap(
					"Type 'boolean' is not assignable to type '() => { bar: false; }'."
				)
			attest(() =>
				type({
					// @ts-expect-error
					foo: [/foo/ as type.cast<"string" & { foo: true }>, "=", true]
				})
			)
				.throws()
				.type.errors.snap(
					"Type 'true' is not assignable to type '(\"string\" & { foo: true; }) | (() => \"string\" & { foo: true; })'."
				)
			attest(
				// @ts-expect-error
				() => type({ foo: [["number[]", "|", "string"], "=", true] })
			)
				.throws()
				.type.errors.snap(
					"Type 'boolean' is not assignable to type 'string | (() => string | number[])'."
				)
			attest(
				// @ts-expect-error
				() => type(["number[]", "|", "string"], "=", true)
			)
				.throws()
				.type.errors.snap(
					"Argument of type 'boolean' is not assignable to parameter of type 'string | (() => string | number[])'."
				)
			// should not cause "instantiation is excessively deep"
			attest(
				// @ts-expect-error
				() => type("number[]", "|", "string").default(true)
			)
				.throws()
				.type.errors(
					"not assignable to parameter of type 'string | (() => string | number[])'."
				)
			// should not cause "instantiation is excessively deep"
			attest(
				// @ts-expect-error
				() => type("number[]", "|", "string").default(() => true)
			)
				.throws()
				.type.errors(
					"not assignable to parameter of type 'string | (() => string | number[])'."
				)
		})

		it("uses input type for morphs", () => {
			// @ts-expect-error
			attest(() => type({ foo: ["string.numeric.parse = true"] }))
				.throws("must be a string (was boolean)")
				.type.errors(
					"Default value true is not assignable to string.numeric.parse"
				)
			// @ts-expect-error
			attest(() => type({ foo: ["string.numeric.parse", "=", true] }))
				.throws("must be a string (was boolean)")
				.type.errors.snap(
					"Type 'boolean' is not assignable to type 'string | (() => string)'."
				)
			// @ts-expect-error
			attest(() => type({ foo: ["string.numeric.parse", "=", () => true] }))
				.throws("must be a string (was boolean)")
				.type.errors(
					"Type '() => boolean' is not assignable to type 'string | (() => string)'."
				)
			const numtos = type("number").pipe(s => `${s}`)
			// @ts-expect-error
			attest(() => type({ foo: [numtos, "=", true] }))
				.throws("must be a number (was boolean)")
				.type.errors(
					"Type 'boolean' is not assignable to type 'number | (() => number)'."
				)
			// @ts-expect-error
			attest(() => type({ foo: [numtos, "=", () => true] }))
				.throws("must be a number (was boolean)")
				.type.errors(
					"Type '() => boolean' is not assignable to type 'number | (() => number)'."
				)

			const f = type({
				foo1: "string.numeric.parse = '123'",
				foo2: ["string.numeric.parse", "=", "123"],
				foo3: ["string.numeric.parse", "=", () => "123"],
				bar1: [numtos, "=", 123],
				bar2: [numtos, "=", () => 123],
				baz1: type(numtos, "=", 123),
				baz2: type(numtos, "=", () => 123),
				baz3: type(numtos).default(123)
			})
			attest(f.assert({})).snap({
				foo1: 123,
				foo2: 123,
				foo3: 123,
				bar1: "123",
				bar2: "123",
				baz1: "123",
				baz2: "123",
				baz3: "123"
			})
		})
	})

	describe("intersection", () => {
		it("two optionals, one default", () => {
			const l = type({ bar: ["number", "=", 5] })
			const r = type({ "bar?": "5" })

			const result = l.and(r)
			attest(result.json).snap({
				optional: [{ default: 5, key: "bar", value: { unit: 5 } }],
				domain: "object"
			})
		})

		it("same default", () => {
			const l = type({ bar: ["number", "=", 5] })
			const r = type({ bar: ["5", "=", 5] })

			const result = l.and(r)
			attest(result.json).snap({
				optional: [
					{ default: 5, key: "bar", value: { unit: 5, meta: { default: 5 } } }
				],
				domain: "object"
			})
		})

		it("removed when intersected with required", () => {
			const l = type({ bar: ["number", "=", 5] })
			const r = type({ bar: "number" })

			const result = l.and(r)
			attest(result.json).snap({
				required: [{ key: "bar", value: "number" }],
				domain: "object"
			})
		})

		it("errors on multiple defaults", () => {
			const l = type({ bar: ["number", "=", 5] })
			const r = type({ bar: ["number", "=", 6] })
			attest(() => l.and(r)).throws.snap(
				"ParseError: Invalid intersection of default values 5 & 6"
			)
		})
	})

	describe("factory functions", () => {
		it("works in tuple", () => {
			const t = type({ foo: ["string", "=", () => "bar"] })
			attest(t.assert({ foo: "bar" })).snap({ foo: "bar" })
		})

		it("works in type tuple", () => {
			const foo = type(["string", "=", () => "bar"])
			const t = type({ foo })
			attest(t.assert({ foo: "bar" })).snap({ foo: "bar" })
		})

		it("works in type args", () => {
			const foo = type("string", "=", () => "bar")
			const t = type({ foo })
			attest(t.assert({ foo: "bar" })).snap({ foo: "bar" })
		})

		it("checks the returned value", () => {
			attest(() => {
				// @ts-expect-error
				type({ foo: ["number", "=", () => "bar"] })
			}).throws.snap(
				"ParseError: Default value is not assignable: must be a number (was a string)"
			)
			attest(() => {
				// @ts-expect-error
				type({ foo: ["number[]", "=", () => "bar"] })
			}).throws.snap(
				"ParseError: Default value is not assignable: must be an array (was string)"
			)
			attest(() => {
				// @ts-expect-error
				type({ foo: [{ a: "number" }, "=", () => ({ a: "bar" })] })
			}).throws.snap(
				"ParseError: Default value is not assignable: a must be a number (was a string)"
			)
		})

		it("morphs the returned value", () => {
			const t = type({ foo: ["string.numeric.parse", "=", () => "123"] })
			attest(t.assert({})).snap({ foo: 123 })
		})

		it("only allows argless functions for factories", () => {
			attest(() => {
				// @ts-expect-error
				type({ bar: ["Function", "=", class {}] })
			})
				.throws.snap(
					"TypeError: Class constructors cannot be invoked without 'new'"
				)
				.type.errors.snap(
					"Type 'typeof (Anonymous class)' is not assignable to type '() => Function'.Type 'typeof (Anonymous class)' provides no match for the signature '(): Function'."
				)
			attest(() => {
				// @ts-expect-error
				type({ bar: ["number", "=", (a: number) => 1] })
			}).type.errors.snap(
				"Type '(a: number) => number' is not assignable to type 'number | (() => number)'.Type '(a: number) => number' is not assignable to type '() => number'.Target signature provides too few arguments. Expected 1 or more, but got 0."
			)
			attest(() => {
				type({ bar: ["number", "=", (a?: number) => 1] })
			})
		})

		it("default factory may return different values", () => {
			let i = 0
			const t = type({ bar: type("number[]").default(() => [++i]) })
			attest(t.assert({}).bar).snap([3])
			attest(t.assert({}).bar).snap([4])
		})

		it("default function factory", () => {
			let i = 0
			const t = type({
				// this requires explicit type argument
				bar: type("Function").default<() => number>(() => {
					const j = ++i
					return () => j
				})
			})
			attest(t.assert({}).bar()).snap(3)
			attest(t.assert({}).bar()).snap(4)
		})

		it("allows union factory", () => {
			let i = 0
			const t = type({
				foo: [["number", "|", "number[]"], "=", () => (i % 2 ? ++i : [++i])]
			})
			attest(t.assert({})).snap({ foo: [3] })
			attest(t.assert({})).snap({ foo: 4 })
		})
	})

	describe("works with factories", () => {
		// it("default array in string", () => {
		// 	const t = type({ bar: type("number[] = []") })
		// 	attest(t.assert({}).bar).snap([])
		// 	attest(t.assert({}).bar !== t.assert({}).bar)
		// })
		it("default array", () => {
			const t = type({
				foo: type("number[]").default(() => [1]),
				bar: type("number[]")
					.pipe(v => v.map(e => e.toString()))
					.default(() => [1])
			})
			const v1 = t.assert({}),
				v2 = t.assert({})
			attest(v1).snap({ foo: [1], bar: ["1"] })
			attest(v1.foo !== v2.foo)
		})
		it("default array is checked", () => {
			attest(() => {
				// @ts-expect-error
				type({ bar: type("number[]").default(() => ["a"]) })
			}).throws(
				writeUnassignableDefaultValueMessage(
					"value at [0] must be a number (was a string)"
				)
			)
			attest(() => {
				type({
					baz: type("number[]")
						.pipe(v => v.map(e => e.toString()))
						// @ts-expect-error
						.default(() => ["a"])
				})
			}).throws(
				writeUnassignableDefaultValueMessage(
					"value at [0] must be a number (was a string)"
				)
			)
		})
		it("default object", () => {
			const t = type({
				foo: type({ "foo?": "string" }).default(() => ({})),
				bar: type({ "foo?": "string" }).default(() => ({ foo: "foostr" })),
				baz: type({ foo: "string = 'foostr'" }).default(() => ({}))
			})
			const v1 = t.assert({}),
				v2 = t.assert({})
			attest(v1).snap({
				foo: {},
				bar: { foo: "foostr" },
				baz: { foo: "foostr" }
			})
			attest(v1.foo !== v2.foo)
		})
		it("default object is checked", () => {
			attest(() => {
				// @ts-expect-error
				type({ foo: type({ foo: "string" }).default({}) })
			}).throws(writeNonPrimitiveNonFunctionDefaultValueMessage(""))
			attest(() => {
				type({
					// @ts-expect-error
					bar: type({ foo: "number" }).default(() => ({ foo: "foostr" }))
				})
			}).throws(
				writeUnassignableDefaultValueMessage(
					"foo must be a number (was a string)"
				)
			)
		})
	})
})
