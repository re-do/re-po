import { assert } from "@re-/assert"
import { compile, model } from "@re-/model"
import { duplicateSpaceError } from "../errors.js"
import { typeDefProxy } from "../internal.js"

describe("compile", () => {
    test("single", () => {
        assert(compile({ a: "string" }).types.a).typed as string
        // @ts-expect-error
        assert(() => compile({ a: "strig" })).throwsAndHasTypeError(
            "Unable to determine the type of 'strig'."
        )
    })
    test("independent", () => {
        assert(compile({ a: "string", b: { c: "boolean" } }).types.b).typed as {
            c: boolean
        }
        assert(() =>
            // @ts-expect-error
            compile({ a: "string", b: { c: "uhoh" } })
        ).throwsAndHasTypeError("Unable to determine the type of 'uhoh'")
    })
    test("interdependent", () => {
        assert(compile({ a: "string", b: { c: "a" } }).types.b.c)
            .typed as string
        assert(() =>
            // @ts-expect-error
            compile({ a: "yikes", b: { c: "a" } })
        ).throwsAndHasTypeError("Unable to determine the type of 'yikes'")
    })
    test("recursive", () => {
        // Recursive type displays any but calculates just-in-time for each property access
        assert(
            compile({ a: { dejaVu: "a?" } }).types.a.dejaVu?.dejaVu?.dejaVu
        ).type.toString.snap("{ dejaVu?: any | undefined; } | undefined")
    })
    test("cyclic", () => {
        const space = compile({ a: { b: "b" }, b: { a: "a" } })
        // Type hint displays as any on hitting cycle
        assert(space.types.a).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        assert(space.types.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        assert(space.types.a.b.a.b.c).type.errors(
            "Property 'c' does not exist on type '{ a: { b: any; }; }'."
        )
    })
    test("object list", () => {
        assert(compile({ a: "string", b: [{ c: "a" }] }).types.b).typed as [
            {
                c: string
            }
        ]
    })
    test("can parse from compiled types", () => {
        const space = compile({ a: { b: "b" }, b: { a: "a" } })
        assert(space.create("a|b|null").type).type.toString.snap(
            "{ b: { a: { b: { a: any; }; }; }; } | { a: { b: { a: { b: any; }; }; }; } | null"
        )
        assert(() =>
            // @ts-expect-error
            space.create({ nested: { a: "a", b: "b", c: "c" } })
        ).throwsAndHasTypeError("Unable to determine the type of 'c'")
    })
    test("compile result", () => {
        const mySpace = compile({ a: { b: "b?" }, b: { a: "a?" } })
        const a = mySpace.create("a")
        assert(a.type)
            .is(typeDefProxy)
            .type.toString()
            .snap(
                `"{ b?: { a?: { b?: any | undefined; } | undefined; } | undefined; }"`
            )
        assert(mySpace.models.a.references()).equals({ b: ["b"] })
        const aWithExtraneousKey = { c: "extraneous" }
        const extraneousKeyMessage = "Keys 'c' were unexpected."
        assert(a.validate(aWithExtraneousKey).error).is(extraneousKeyMessage)
        assert(() => a.assert(aWithExtraneousKey)).throws(extraneousKeyMessage)
        assert(a.generate()).equals({})
        assert(a.references()).equals(["a"])
        assert(a.definition).typedValue("a")
        assert(mySpace.create("b").type)
            .is(typeDefProxy)
            .type.toString.snap(
                `"{ a?: { b?: { a?: any | undefined; } | undefined; } | undefined; }"`
            )
        assert(mySpace.models.b.references()).equals({ a: ["a"] })
    })
    test("extension", () => {
        const mySpace = compile(
            {
                user: { name: "string" },
                group: { members: "user[]" },
                onCycle: "number"
            },
            {
                validate: { ignoreExtraneousKeys: true },
                models: {
                    user: {
                        validate: {
                            ignoreExtraneousKeys: false
                        }
                    }
                }
            }
        )
        const extended = mySpace.extend(
            { user: { age: "number" }, other: "user[]", onCycle: "boolean" },
            {
                models: {
                    group: {
                        generate: {
                            onRequiredCycle: true
                        }
                    },
                    other: {
                        validate: {
                            ignoreExtraneousKeys: true
                        }
                    }
                }
            }
        )
        assert(extended.types).typed as {
            user: {
                age: number
            }
            group: {
                members: {
                    age: number
                }[]
            }
            other: {
                age: number
            }[]
        }
        assert(extended.config).equals({
            onCycle: "boolean",
            validate: {
                ignoreExtraneousKeys: true
            },
            models: {
                user: {
                    validate: {
                        ignoreExtraneousKeys: false
                    }
                },
                group: {
                    generate: {
                        onRequiredCycle: true
                    }
                },
                other: {
                    validate: {
                        ignoreExtraneousKeys: true
                    }
                }
            }
        })
    })
    test("compiled space can be provided via model options", () => {
        const space = compile({
            user: { name: "string" },
            group: { members: "user[]" }
        })
        const city = model({ people: "user[]", groups: "group[]" }, { space })
        assert(city.type).typed as {
            people: {
                name: string
            }[]
            groups: {
                members: {
                    name: string
                }[]
            }[]
        }
        assert(
            city.validate({
                people: [{ name: "David" }],
                groups: [{ members: [{ first: "David", last: "Blass" }] }]
            }).error
        ).snap(
            `"At path groups/0/members/0, required keys 'name' were missing. Keys 'first, last' were unexpected."`
        )
    })
    test("space cannot be redefined from create", () => {
        const space = compile({ a: "string" })
        assert(() =>
            space.create("a", {
                space: { dictionary: { a: {} } }
            })
        ).throws(duplicateSpaceError)
    })
})
