import {
    chainableNoOpProxy,
    ElementOf,
    Evaluate,
    IterateType,
    Merge,
    MutuallyExclusiveProps
} from "@re-/tools"
import { Node } from "./node/index.js"
import { ErrorResult } from "./node/traversal/allows.js"
import { Root } from "./root.js"
import { Space, SpaceMeta } from "./space.js"

export const type: TypeFunction = (
    definition,
    options = {},
    space?: SpaceMeta
) => {
    const root = Root.parse(definition, Node.initializeContext(options, space))
    return new Type(definition, root, options) as any
}

export const dynamic = type as DynamicTypeFunction

export type DynamicTypeFunction = (
    definition: unknown,
    options?: TypeOptions
) => DynamicType

export type DynamicType = TypeFrom<unknown, {}, unknown>

export type TypeOptions = {
    validate?: Node.Allows.Options
    create?: Node.Create.Options
}

export type TypeFunction<S extends Space = { Dict: {}; Meta: {} }> = <Def>(
    definition: Root.Validate<Def, S["Dict"]>,
    options?: TypeOptions
) => TypeFrom<Def, S["Dict"], Infer<Def, Node.InferenceContext.FromSpace<S>>>

export type TypeFrom<Def, Dict, Inferred> = Evaluate<{
    definition: Def
    infer: Inferred
    check: ValidateFunction<Inferred>
    assert: AssertFunction<Inferred>
    default: Inferred
    tree: Root.Parse<Def, Dict>
    create: CreateFunction<Inferred>
    references: ReferencesFunction<Def, Dict>
}>

export class Type implements DynamicType {
    constructor(
        public definition: unknown,
        public root: Node.base,
        public config: TypeOptions = {}
    ) {}

    get infer() {
        return chainableNoOpProxy
    }

    get default() {
        return this.create()
    }

    get tree() {
        return this.root.tree as any
    }

    check(value: unknown, options?: Node.Allows.Options) {
        const args = Node.Allows.createArgs(
            value,
            options,
            this.config.validate
        )
        const customValidator =
            args.cfg.validator ?? args.ctx.modelCfg.validator ?? "default"
        if (customValidator !== "default") {
            Node.Allows.customValidatorAllows(customValidator, this.root, args)
        } else {
            this.root.allows(args)
        }
        return args.errors.length
            ? {
                  errors: new ErrorResult(...args.errors)
              }
            : { data: value }
    }

    assert(value: unknown, options?: Node.Allows.Options) {
        const validationResult = this.check(value, options)
        if (validationResult.errors) {
            throw new Node.Allows.CheckError(validationResult.errors.summary)
        }
        return validationResult.data
    }

    create(options?: Node.Create.Options) {
        return this.root.create(
            Node.Create.createArgs(options, this.config.create)
        )
    }

    references(options: Node.References.Options = {}) {
        return this.root.references(options) as any
    }
}

export type AssertOptions = Node.Allows.Options

export type ValidateFunction<Inferred> = (
    value: unknown,
    options?: Node.Allows.Options
) => ValidationResult<Inferred>

export type ValidationResult<Inferred> = MutuallyExclusiveProps<
    { data: Inferred },
    {
        errors: ErrorResult
    }
>

export type AssertFunction<Inferred> = (
    value: unknown,
    options?: Node.Allows.Options
) => Inferred

export type CreateFunction<Inferred> = (
    options?: Node.Create.Options
) => Inferred

export type ReferencesFunction<Def, Dict> = <
    Options extends Node.References.Options = {}
>(
    options?: Options
) => Merge<
    {
        filter: Node.References.FilterFunction<string>
        preserveStructure: false
    },
    Options
> extends Node.References.Options<infer Filter, infer PreserveStructure>
    ? TransformReferences<
          Root.References<Def, Dict, PreserveStructure>,
          Filter,
          "list"
      >
    : []

export type Infer<Def, S extends Space> = Root.Infer<
    Def,
    Node.InferenceContext.From<{
        Dict: S["Dict"]
        Meta: S["Meta"]
        Seen: {}
    }>
>

export type Validate<Def, Dict = {}> = Root.Validate<Def, Dict>

export type References<
    Def,
    Dict,
    Options extends Node.References.TypeOptions = {}
> = Merge<
    { filter: string; preserveStructure: false; format: "list" },
    Options
> extends Node.References.TypeOptions<
    infer Filter,
    infer PreserveStructure,
    infer Format
>
    ? TransformReferences<
          Root.References<Def, Dict, PreserveStructure>,
          Filter,
          Format
      >
    : {}

type TransformReferences<
    References,
    Filter extends string,
    Format extends Node.References.TypeFormat
> = References extends string[]
    ? FormatReferenceList<FilterReferenceList<References, Filter, []>, Format>
    : {
          [K in keyof References]: TransformReferences<
              References[K],
              Filter,
              Format
          >
      }

type FilterReferenceList<
    References extends string[],
    Filter extends string,
    Result extends string[]
> = References extends IterateType<string, infer Current, infer Remaining>
    ? FilterReferenceList<
          Remaining,
          Filter,
          Current extends Filter ? [...Result, Current] : Result
      >
    : Result

type FormatReferenceList<
    References extends string[],
    Format extends Node.References.TypeFormat
> = Format extends "tuple"
    ? References
    : Format extends "list"
    ? ElementOf<References>[]
    : ElementOf<References>
