import {
    StringifyPossibleTypes,
    Split,
    Join,
    Unlisted,
    narrow
} from "@re-do/utils"
import {
    ParseTypeRecurseOptions,
    ValidateTypeRecurseOptions
} from "../common.js"
import { Fragment } from "./fragment.js"
import { ValidationErrorMessage } from "../errors.js"
import { BuiltIn } from "./builtIn.js"

export * from "../common.js"

// These values can be directly compared for equality
export const comparableDefaultValues = narrow({
    undefined: undefined,
    any: undefined,
    unknown: undefined,
    void: undefined,
    null: null,
    false: false,
    true: true,
    boolean: false,
    number: 0,
    string: "",
    bigint: BigInt(0)
})

export const comparableDefaultValueSet = [
    undefined,
    null,
    false,
    true,
    0,
    "",
    BigInt(0)
]

export const nonComparableDefaultValues = narrow({
    // These types are comparable, but if they came
    // from a literal, we should check the type instead
    // of the value
    number: 0 as number,
    string: "" as string,
    // These types cannot be directly checked for equality
    object: {},
    symbol: Symbol(),
    function: (...args: any[]) => undefined as any,
    never: undefined as never
})

// Default values for each built in type, sorted by precedence
export const builtInDefaultValues: { [K in BuiltIn.Definition]: any } = {
    ...comparableDefaultValues,
    ...nonComparableDefaultValues
}

export type ParseSplittableResult<
    Components = any[],
    Errors extends string = string
> = {
    Components: Components extends any[] ? Components : [Components]
    Errors: Errors
}

export type ParseSplittable<
    Delimiter extends string,
    Def extends string,
    TypeSet,
    Options extends ParseTypeRecurseOptions,
    Components extends string[] = Split<Def, Delimiter>
> = {
    [I in keyof Components]: Fragment.Parse<
        Components[I] & string,
        TypeSet,
        Options
    >
}

export type ValidateSplittable<
    Delimiter extends string,
    Def extends string,
    Root extends string,
    TypeSet,
    Options extends ValidateTypeRecurseOptions,
    Components extends string[] = Split<Def, Delimiter>,
    ValidateDefinitions extends string[] = {
        [Index in keyof Components]: Fragment.Validate<
            Components[Index] & string,
            Components[Index] & string,
            TypeSet,
            Options
        >
    },
    ValidatedDefinition extends string = Join<ValidateDefinitions, Delimiter>
> = Options["extractTypesReferenced"] extends true
    ? Unlisted<ValidateDefinitions>
    : Def extends ValidatedDefinition
    ? Root
    : StringifyPossibleTypes<
          Extract<
              ValidateDefinitions[keyof ValidateDefinitions],
              ValidationErrorMessage
          >
      >
