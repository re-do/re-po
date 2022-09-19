import type { Str } from "../parser/str/str.js"
import type { Base } from "./base.js"
import type { Structure } from "./structure/index.js"

export type RootInfer<
    Def,
    Ctx extends Base.InferenceContext
> = unknown extends Def
    ? Def
    : Def extends string
    ? Str.Infer<Def, Ctx>
    : Structure.Infer<Def, Ctx>

export type RootReferences<
    Def,
    Dict,
    PreserveStructure extends boolean
> = Def extends string
    ? Str.References<Def, Dict>
    : Structure.References<Def, Dict, PreserveStructure>
