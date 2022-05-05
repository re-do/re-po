import { Evaluate, Narrow, isEmpty, KeyValuate, Get, narrow } from "@re-/tools"
import { Root } from "./definitions/index.js"
import {
    ParseContext,
    defaultParseContext,
    InheritableMethodContext
} from "./definitions/parser.js"
import {
    duplicateSpaceError,
    stringifyErrors,
    ValidationErrors
} from "./errors.js"
import { SpaceDefinition } from "./space.js"
import {
    errorsFromCustomValidator,
    Merge,
    typeDefProxy,
    MergeAll,
    Unset
} from "./internal.js"

export type FastParse<
    Def,
    Dict,
    Options = {},
    OptionsWithDefaults = Merge<DefaultParseOptions, Options>,
    Checked = Dict //ValidateSpaceDict<Dict>
> = Root.FastParse<
    Def,
    Checked,
    OptionsWithDefaults & {
        seen: {}
    }
>

export type ReferencesTypeOptions = {
    asTuple?: boolean
    asList?: boolean
    filter?: string
}

export type ParseConfig = {
    onCycle?: any
    deepOnCycle?: boolean
    onResolve?: any
}

export type DefaultParseOptions = {
    onCycle: Unset
    deepOnCycle: false
    onResolve: Unset
}

// Just use unknown for now since we don't have all the definitions yet
// but we still want to allow references to other declared types
export type CheckReferences<
    Def,
    DeclaredTypeName extends string
> = Root.FastValidate<
    Def,
    {
        [TypeName in DeclaredTypeName]: "unknown"
    }
>

export type ReferencesConfig = {}

export type GenerateConfig = {
    // By default, generate will throw if it encounters a cyclic required type
    // If this options is provided, it will return its value instead
    onRequiredCycle?: any
}

export type ModelConfig = {
    parse?: ParseConfig
    validate?: ValidateConfig
    generate?: GenerateConfig
    references?: ReferencesConfig
    space?: SpaceDefinition
}

export type ValidateConfig = {
    ignoreExtraneousKeys?: boolean
    validator?: CustomValidator
    verbose?: boolean
}

export type CustomValidator = (
    value: unknown,
    errors: ValidationErrors,
    ctx: Omit<InheritableMethodContext<any, any>, "components">
) => string | ValidationErrors

export type AssertOptions = ValidateConfig

export type ValidateFunction = <Options extends ValidateConfig>(
    value: unknown,
    options?: Options
) => {
    error?: string
    errorsByPath?: ValidationErrors
}

const createRootValidate =
    (
        validate: ReturnType<typeof Root.parser.parse>["validate"],
        definition: any,
        customValidator: CustomValidator | undefined
    ): ValidateFunction =>
    (value, options) => {
        let errorsByPath = validate(value, options)
        if (customValidator) {
            errorsByPath = errorsFromCustomValidator(customValidator, [
                value,
                errorsByPath,
                { def: definition, ctx: defaultParseContext }
            ])
        }
        return isEmpty(errorsByPath)
            ? {}
            : {
                  error: stringifyErrors(errorsByPath),
                  errorsByPath: errorsByPath
              }
    }

export type CreateCreateFunction = <
    PredefinedSpace extends SpaceDefinition | null
>(
    predefinedSpace: Narrow<PredefinedSpace>
) => CreateFunction<PredefinedSpace>

export const createCreateFunction: CreateCreateFunction =
    (predefinedSpace) => (definition, config) => {
        if (predefinedSpace && config?.space) {
            throw new Error(duplicateSpaceError)
        }
        const space: any = predefinedSpace ??
            config?.space ?? { dictionary: {} }
        const context: ParseContext = {
            ...defaultParseContext,
            // @ts-ignore
            config: {
                ...config,
                space
            }
        }
        const {
            validate: internalValidate,
            references,
            generate
        } = Root.parser.parse(definition, context)
        const validate = createRootValidate(
            internalValidate,
            definition,
            config?.validate?.validator
        )
        return {
            type: typeDefProxy,
            space,
            definition,
            validate,
            references,
            generate,
            assert: (value: unknown, options?: AssertOptions) => {
                const { error } = validate(value, options)
                if (error) {
                    throw new Error(error)
                }
            }
        } as any
    }

export type Model<
    Def,
    Space,
    Options,
    ModelType = FastParse<
        Def,
        Get<Space, "dictionary">,
        MergeAll<
            [
                DefaultParseOptions,
                KeyValuate<Get<Space, "config">, "parse">,
                Options
            ]
        >
    >
> = Evaluate<{
    definition: Def
    type: ModelType
    space: Space
    config: ModelConfig
    validate: ValidateFunction
    assert: (value: unknown, options?: AssertOptions) => void
    generate: (options?: GenerateConfig) => ModelType
    references: (options?: ReferencesConfig) => any
}>

// Ensures that tuple definitions are not widened to arrays, similar to Narrow
type Validate<Def, Dict> = Def extends [] ? Def : Root.FastValidate<Def, Dict>

export type CreateFunction<PredefinedSpace extends SpaceDefinition | null> = <
    Def,
    Options extends ModelConfig,
    ActiveSpace extends SpaceDefinition = PredefinedSpace extends null
        ? Options["space"] extends SpaceDefinition
            ? Options["space"]
            : { dictionary: {} }
        : PredefinedSpace,
    Dict = Get<ActiveSpace, "dictionary">,
    Ctx = MergeAll<
        [
            DefaultParseOptions,
            KeyValuate<Get<ActiveSpace, "config">, "parse">,
            Options
        ]
    >
>(
    definition: Validate<Def, Dict>,
    // TS has a problem inferring the narrowed type of a function hence the intersection hack
    // If removing it doesn't break any types or tests, do it!
    options?: Options
) => Model<
    Def,
    Evaluate<ActiveSpace>,
    Options["parse"] extends ParseConfig ? Options["parse"] : {},
    FastParse<Def, Dict, Ctx>
>

/**
 * Create a model.
 * @param definition {@as string} Document this.
 * @param options {@as ModelConfig?} And that.
 * @returns {@as any} The result.
 */
export const create = createCreateFunction(null)

const f = create(["string", 5]).type

const user = create(
    {
        name: {
            first: "string",
            middle: "string?",
            last: "string"
        },
        age: "number",
        browser: "'chrome'|'firefox'|'other'|null",
        ok: "a"
    },
    narrow({ space: { dictionary: { a: { a: "'ok'" } } } })
)
