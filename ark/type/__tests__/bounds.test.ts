import { attest } from "@arktype/attest"
import { schema, writeUnboundableMessage } from "@arktype/schema"
import { writeMalformedNumericLiteralMessage } from "@arktype/util"
import { type } from "arktype"
import { writeDoubleRightBoundMessage } from "../parser/semantic/bounds.js"
import {
	writeMultipleLeftBoundsMessage,
	writeOpenRangeMessage,
	writeUnpairableComparatorMessage
} from "../parser/string/reduce/shared.js"
import {
	singleEqualsMessage,
	writeInvalidLimitMessage,
	writeLimitMismatchMessage
} from "../parser/string/shift/operator/bounds.js"

describe("bounds", () => {
	describe("string", () => {
		it(">", () => {
			const t = type("number>0")
			attest<number>(t.infer)
			attest(t.allows(-1)).equals(false)
			attest(t.allows(0)).equals(false)
			attest(t.allows(1)).equals(true)
		})
		it("<", () => {
			const t = type("number<10")
			attest<number>(t.infer)
			const expected = schema({
				domain: "number",
				max: { rule: 10, exclusive: true }
			})
			attest(t.json).equals(expected.json)
		})
		it("<=", () => {
			const t = type("number<=-49")
			attest<number>(t.infer)
			const expected = schema({
				domain: "number",
				max: { rule: -49, exclusive: false }
			})
			attest(t.json).equals(expected.json)
		})
		it("==", () => {
			const t = type("number==3211993")
			attest<number>(t.infer)
			const expected = schema({
				domain: "number",
				min: { rule: 3211993, exclusive: false },
				max: { rule: 3211993, exclusive: false }
			})
			attest(t.json).equals(expected.json)
		})
		it("<,<=", () => {
			const t = type("-5<number<=5")
			attest<number>(t.infer)
			const expected = schema({
				domain: "number",
				min: { rule: -5, exclusive: true },
				max: { rule: 5, exclusive: false }
			})
			attest(t.json).equals(expected.json)
		})
		it("<=,<", () => {
			const t = type("-3.23<=number<4.654")
			attest<number>(t.infer)
			const expected = schema({
				domain: "number",
				min: { rule: -3.23, exclusive: false },
				max: { rule: 4.654, exclusive: true }
			})
			attest(t.json).equals(expected.json)
		})
		it("whitespace following comparator", () => {
			const t = type("number > 3")
			attest<number>(t.infer)
			const expected = schema({
				domain: "number",
				min: { rule: 3, exclusive: true }
			})
			attest(t.json).equals(expected.json)
		})

		it("single equals", () => {
			// @ts-expect-error
			attest(() => type("string=5")).throwsAndHasTypeError(singleEqualsMessage)
		})
		it("invalid left comparator", () => {
			// @ts-expect-error
			attest(() => type("3>number<5")).throwsAndHasTypeError(
				writeUnpairableComparatorMessage(">")
			)
		})
		it("invalid right double-bound comparator", () => {
			// @ts-expect-error
			attest(() => type("3<number==5")).throwsAndHasTypeError(
				writeUnpairableComparatorMessage("==")
			)
		})
		it("unpaired left", () => {
			// @ts-expect-error temporarily disabled type snapshot as it is returning ''
			attest(() => type("3<number")).throws(writeOpenRangeMessage(3, ">"))
		})
		it("unpaired left group", () => {
			// @ts-expect-error
			attest(() => type("(-1<=number)")).throws(writeOpenRangeMessage(-1, ">="))
		})
		it("double left", () => {
			// @ts-expect-error
			attest(() => type("3<5<8")).throwsAndHasTypeError(
				writeMultipleLeftBoundsMessage(3, ">", 5, ">")
			)
		})
		it("empty range", () => {
			attest(() => type("3<=number<2")).throws.snap(
				"Error: Intersection of <2 and >=3 results in an unsatisfiable type"
			)
		})
		it("double right bound", () => {
			// @ts-expect-error
			attest(() => type("number>0<=200")).type.errors(
				writeDoubleRightBoundMessage("number")
			)
		})
		it("non-narrowed bounds", () => {
			const a = 5 as number
			const b = 7 as number
			const t = type(`${a}<number<${b}`)
			attest<number>(t.infer)
		})
		it("fails at runtime on malformed right", () => {
			attest(() => type("number<07")).throws(
				writeMalformedNumericLiteralMessage("07", "number")
			)
		})
		it("fails at runtime on malformed lower", () => {
			attest(() => type("3.0<number<5")).throws(
				writeMalformedNumericLiteralMessage("3.0", "number")
			)
		})

		it("number", () => {
			attest<number>(type("number==-3.14159").infer)
		})
		it("string", () => {
			attest<string>(type("string<=5").infer)
		})
		it("array", () => {
			attest<boolean[]>(type("87<=boolean[]<89").infer)
		})
		it("multiple boundable categories", () => {
			const t = type("(string|boolean[]|number)>0")
			attest<string | boolean[] | number>(t.infer)
			const expected = type("string>0|boolean[]>0|number>0")
			attest(t.json).equals(expected.json)
		})

		it("unknown", () => {
			// @ts-expect-error
			attest(() => type("unknown<10")).throwsAndHasTypeError(
				writeUnboundableMessage("unknown")
			)
		})
		it("unboundable", () => {
			// @ts-expect-error
			attest(() => type("object>10")).throwsAndHasTypeError(
				writeUnboundableMessage("object")
			)
		})
		it("overlapping", () => {
			// @ts-expect-error
			attest(() => type("1<(number|object)<10"))
				.throws(writeUnboundableMessage("object"))
				// At compile time we don't have access to the specific branch that failed so we
				// summarize the expression
				.type.errors(writeUnboundableMessage("number | object"))
		})

		it("number with right Date bound", () => {
			attest(() =>
				//@ts-expect-error
				type("number<d'2001/01/01'")
			)
				.throws(
					writeInvalidLimitMessage(
						"<",
						"Mon Jan 01 2001 00:00:00 GMT-0500 (Eastern Standard Time)",
						"right"
					)
				)
				.type.errors(writeInvalidLimitMessage("<", "d'2001/01/01'", "right"))
		})
		it("number with left Date bound", () => {
			//@ts-expect-error
			attest(() => type("d'2001/01/01'<number<2"))
				.throws(writeLimitMismatchMessage("a number", "2001/01/01"))
				.type.errors(writeInvalidLimitMessage("<", "d'2001/01/01'", "left"))
		})
	})

	describe("chained", () => {
		it("min", () => {
			const t = type("number").min(5)
			const expected = type("number>=5")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})
		it("max", () => {
			const t = type("number").max(10)
			const expected = type("number<=10")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("minLength", () => {
			const t = type("string").minLength(5)
			const expected = type("string>=5")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		it("maxLength", () => {
			const t = type("string").maxLength(10)
			const expected = type("string<=10")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})

		// TODO:  reenable
		// it("chained after", () => {
		// 	const t = type("Date").after(new Date(2022, 0, 1))
		// 	// widen the input to a string so both are non-narrowed
		// 	const expected = type(`Date>=d'${"2022-01-01" as string}'`)
		// 	attest<typeof expected>(t)
		// 	attest(t.json).equals(expected.json)
		// })

		// it("chained before", () => {
		// 	const t = type("Date").before(5)
		// 	const expected = type("Date<=5")
		// 	attest<typeof expected>(t)
		// 	attest(t.json).equals(expected.json)
		// })

		it("exclusive", () => {
			const t = type("number").min({ rule: 1337, exclusive: true })
			const expected = type("number>1337")
			attest<typeof expected>(t)
			attest(t.json).equals(expected.json)
		})
	})

	describe("dates", () => {
		// it("single", () => {
		// 	const t = type("Date<d'2023/1/12'")
		// 	attest<Date>(t.infer)
		// 	attest(t.json).equals(
		// 		// TODO: Dates?
		// 		expectedDateBoundsCondition({
		// 			limitKind: "max",
		// 			exclusive: true,
		// 			limit: new Date("2023/1/12").valueOf()
		// 		})
		// 	)
		// })
		// it("equality", () => {
		// 	const t = type("Date==d'2020-1-1'")
		// 	attest<Date>(t.infer)
		// 	attest(t.json).equals(
		// 		expectedDateBoundsCondition(
		// 			{
		// 				limitKind: "min",
		// 				exclusive: false,
		// 				limit: new Date("2020-1-1").valueOf()
		// 			},
		// 			{
		// 				limitKind: "max",
		// 				exclusive: false,
		// 				limit: new Date("2020-1-1").valueOf()
		// 			}
		// 		)
		// 	)
		// 	attest(t.allows(new Date("2020/01/01"))).equals(true)
		// 	attest(t.allows(new Date("2020/01/02"))).equals(false)
		// })
		// it("double", () => {
		// 	const t = type("d'2001/10/10'<Date<d'2005/10/10'")
		// 	attest<Date>(t.infer)
		// 	attest(t.json).equals(
		// 		expectedDateBoundsCondition(
		// 			{
		// 				limitKind: "min",
		// 				exclusive: true,
		// 				limit: new Date("2001/10/10").valueOf()
		// 			},
		// 			{
		// 				limitKind: "max",
		// 				exclusive: true,
		// 				limit: new Date("2005/10/10").valueOf()
		// 			}
		// 		)
		// 	)
		// 	attest(t.allows(new Date("2003/10/10"))).equals(true)
		// 	attest(t.allows(new Date("2001/10/10"))).equals(false)
		// 	attest(t.allows(new Date("2005/10/10"))).equals(false)
		// })
		it("dynamic", () => {
			const now = new Date()
			const t = type(`d'2000'<Date<=d'${now.toISOString()}'`)
			attest<Date>(t.infer)
			attest(t.allows(new Date(now.valueOf() - 1000))).equals(true)
			attest(t.allows(now)).equals(true)
			attest(t.allows(new Date(now.valueOf() + 1000))).equals(false)
		})
	})
})
