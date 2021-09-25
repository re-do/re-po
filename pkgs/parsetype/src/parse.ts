import {
    ExcludeByValue,
    FilterByValue,
    TypeError,
    Evaluate,
    ListPossibleTypes,
    Exact
} from "@re-do/utils"
import { ValidateTypeDefinition, ValidateTypeSet } from "./validate"
import {
    GroupedType,
    OrType,
    ListType,
    OptionalType,
    BuiltInType,
    BuiltInTypeMap
} from "./common"

export type ParseStringDefinition<
    Definition extends string,
    TypeSet
> = Definition extends OptionalType<infer OptionalType>
    ? ParseStringDefinitionRecurse<OptionalType, TypeSet> | undefined
    : ParseStringDefinitionRecurse<Definition, TypeSet>

export type ParseStringDefinitionRecurse<
    Fragment extends string,
    TypeSet
> = Fragment extends GroupedType<infer Group>
    ? ParseStringDefinitionRecurse<Group, TypeSet>
    : Fragment extends ListType<infer ListItem>
    ? ParseStringDefinitionRecurse<ListItem, TypeSet>[]
    : Fragment extends OrType<infer First, infer Second>
    ?
          | ParseStringDefinitionRecurse<First, TypeSet>
          | ParseStringDefinitionRecurse<Second, TypeSet>
    : Fragment extends keyof TypeSet
    ? ParseType<TypeSet[Fragment], TypeSet>
    : Fragment extends BuiltInType
    ? BuiltInTypeMap[Fragment]
    : TypeError<`Unable to parse the type of '${Fragment}'.`>

export type ParseObjectDefinition<Definition extends object, TypeSet> = {
    [PropName in keyof ExcludeByValue<Definition, OptionalType>]: ParseType<
        Definition[PropName],
        TypeSet
    >
} &
    {
        [PropName in keyof FilterByValue<
            Definition,
            OptionalType
        >]?: Definition[PropName] extends OptionalType<infer OptionalType>
            ? ParseType<OptionalType, TypeSet>
            : TypeError<`Expected property ${Extract<
                  PropName,
                  string | number
              >} to be optional.`>
    }

export type ParseType<Definition, TypeSet> = Definition extends string
    ? ParseStringDefinition<Definition, TypeSet>
    : Definition extends object
    ? Evaluate<ParseObjectDefinition<Definition, TypeSet>>
    : TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>

export const parse = <Definition, DeclaredTypeSet>(
    definition: ValidateTypeDefinition<
        Definition,
        ListPossibleTypes<keyof DeclaredTypeSet>
    >,
    declaredTypeSet?: Exact<DeclaredTypeSet, ValidateTypeSet<DeclaredTypeSet>>
) => null as ParseType<Definition, DeclaredTypeSet>
