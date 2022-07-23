import { ListPossibleTypes, StringReplace } from "@re-/tools"
import { Type } from "ts-morph"
import { bench } from "../../src/index.js"

type MakeTrivialType<S extends string> = `hello${S}`

type MakeNonTrivialType<S extends string> = StringReplace<keyof Type, "e", S>

type MakeComplexType<S extends string> = ListPossibleTypes<
    StringReplace<keyof Type, "e", S>
>

bench("trvial type", () => {
    return {} as any as MakeTrivialType<"!">
}).type()

bench("non-trvial type", () => {
    return {} as any as MakeNonTrivialType<"!">
}).type()

bench("complex type", () => {
    return [] as any as MakeComplexType<"!">
}).type()

bench("duplicate complex type", () => {
    return [] as any as MakeComplexType<"!">
}).type()
