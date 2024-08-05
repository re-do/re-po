import { attest, contextualize } from "@ark/attest"
import {
	writeMissingSubmoduleAccessMessage,
	writeNonSubmoduleDotMessage,
	writeUnresolvableMessage
} from "@ark/schema"
import {
	scope,
	type,
	type Module,
	type Scope,
	type Submodule,
	type Type,
	type BoundModule
} from "arktype"
import type { Out } from "arktype/internal/ast.js"

contextualize.each(
	"submodule",
	() =>
		scope({
			a: "string",
			b: "sub.alias",
			sub: scope({ alias: "number" }).export()
		}),
	it => {
		it("base", $ => {
			const types = $.export()
			attest<
				Module<{
					a: string
					b: number
					sub: Module<{
						alias: number
					}>
				}>
			>(types)

			attest<number>(types.sub.alias.infer)
			const expected = type("number").json
			attest(types.sub.alias.json).is(expected)
			attest(types.b.json).is(expected)
		})

		it("non-submodule dot access", $ => {
			// @ts-expect-error
			attest(() => $.type("b.foo")).throwsAndHasTypeError(
				writeNonSubmoduleDotMessage("b")
			)
		})

		it("thunk submodule", () => {
			const $ = scope({
				a: "string",
				c: "a",
				sub: () =>
					scope({
						...$.import("a", "c"),
						foo: "a",
						bar: "foo"
					}).export()
			})
			attest<
				Scope<{
					a: string
					c: string
					sub: Submodule<{
						foo: string
						bar: string
					}>
				}>
			>($)
		})

		it("no alias reference", $ => {
			// @ts-expect-error
			attest(() => $.type("sub")).throwsAndHasTypeError(
				writeMissingSubmoduleAccessMessage("sub")
			)
		})

		it("bad alias reference", $ => {
			// @ts-expect-error
			attest(() => $.type("sub.marine")).throwsAndHasTypeError(
				writeUnresolvableMessage("sub.marine")
			)
		})

		it("completions", () => {
			const base = scope({ foo: "true" }).export()
			// @ts-expect-error
			attest(() => scope({ base, reference: "base." }).export())
				.throws(writeUnresolvableMessage("base."))
				.type.completions({ "base.": ["base.foo"] })
		})

		it("can reference subaliases in expression", () => {
			const dateFrom = type("parse.date | Date")

			attest<Date | ((In: string) => Out<Date>)>(dateFrom.t)

			attest(dateFrom("05-21-1993")).instanceOf(Date)
			attest(dateFrom(new Date())).instanceOf(Date)

			attest(dateFrom("foobar").toString()).snap(
				'must be a valid date (was "foobar")'
			)
		})

		// TODO: private aliases
	}
)

contextualize.each(
	"nested submodule",
	() =>
		scope({
			outer: scope({
				inner: scope({
					alias: "1"
				}).export()
			}).export()
		}),
	it => {
		type Expected$ = {
			outer: Submodule<{
				inner: Submodule<{
					alias: 1
				}>
			}>
		}

		it("export", $ => {
			const types = $.export()

			attest<Module<Expected$>>(types)

			attest<
				BoundModule<
					{
						inner: Submodule<{
							alias: 1
						}>
					},
					Expected$
				>
			>(types.outer)
			attest<
				BoundModule<
					{
						alias: 1
					},
					Expected$
				>
			>(types.outer.inner)
			attest<Type<1, Expected$>>(types.outer.inner.alias)

			attest(types.outer.inner.alias.expression).equals("1")
			attest(types.outer.inner.alias.$.json).snap({
				"outer.inner.alias": { unit: 1 }
			})
		})

		it("reference", $ => {
			const t = $.type(["outer.inner.alias"])
			attest<Type<[1], Expected$>>(t)
			attest(t.expression).snap("[1]")
		})

		it("completions", $ => {
			attest(() =>
				$.type({
					// @ts-expect-error
					a: "ou",
					// @ts-expect-error
					b: "outer.",
					// @ts-expect-error
					c: "outer.inner."
				})
			).completions({
				ou: ["outer"],
				"outer.": ["outer.inner"],
				"outer.inner.": ["outer.inner.alias"]
			})
		})

		type DeepExpected$ = {
			a: Submodule<{
				b: Submodule<{
					c: Submodule<{
						d: Submodule<{
							e: Submodule<{
								f: Submodule<{
									g: Submodule<{
										alias: 1
									}>
								}>
							}>
						}>
					}>
				}>
			}>
		}

		it("deep", () => {
			const $ = scope({
				a: scope({
					b: scope({
						c: scope({
							d: scope({
								e: scope({
									f: scope({
										g: scope({
											alias: "1"
										}).export()
									}).export()
								}).export()
							}).export()
						}).export()
					}).export()
				}).export()
			})

			const t = $.type("0 | a.b.c.d.e.f.g.alias")
			attest<Type<0 | 1, DeepExpected$>>(t)
			attest(t.expression).snap("0 | 1")
			attest(() =>
				$.type({
					// @ts-expect-error
					foo: "a.b.c.d.e.f.g."
				})
			).completions({ "a.b.c.d.e.f.g.": ["a.b.c.d.e.f.g.alias"] })
		})
	}
)
