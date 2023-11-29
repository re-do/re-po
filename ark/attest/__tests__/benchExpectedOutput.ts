import { bench } from "@arktype/attest"
import type { makeComplexType as externalmakeComplexType } from "./utils.js"

const fakeCallOptions = {
	until: { count: 2 },
	fakeCallMs: "count",
	benchFormat: { noExternal: true }
}

bench(
	"bench call single stat median",
	() => {
		return "boofoozoo".includes("foo")
	},
	fakeCallOptions
).median([2, "ms"])

bench(
	"bench call single stat",
	() => {
		return "boofoozoo".includes("foo")
	},
	fakeCallOptions
).mean([2, "ms"])

bench(
	"bench call mark",
	() => {
		return /.*foo.*/.test("boofoozoo")
	},
	fakeCallOptions
).mark({ mean: [2, "ms"], median: [2, "ms"] })

type makeComplexType<S extends string> = S extends `${infer head}${infer tail}`
	? head | tail | makeComplexType<tail>
	: S

bench("bench type", () => {
	return {} as makeComplexType<"defenestration">
}).types([182, "instantiations"])

bench("bench type from external module", () => {
	return {} as externalmakeComplexType<"defenestration">
}).types([206, "instantiations"])

bench(
	"bench call and type",
	() => {
		return {} as makeComplexType<"antidisestablishmentarianism">
	},
	fakeCallOptions
)
	.mean([2, "ms"])
	.types([352, "instantiations"])

bench("empty", () => {}).types([13, "instantiations"])
