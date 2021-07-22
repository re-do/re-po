import {
    DeepUpdate,
    transform,
    Unlisted,
    Paths,
    NonCyclic,
    ValueAtPath,
    Leaves
} from "@re-do/utils"
import { FileStore, FileStoreOptions } from "./FileStore"
import {
    Data,
    InteractionOptions,
    Relationships,
    FileDbContext,
    FindBy,
    ShallowModel,
    ReuseExisting
} from "./common.js"
import { createDependentsMap } from "./relationships.js"
import { create, CreateOptions } from "./create.js"
import { remove, RemoveOptions } from "./remove.js"
import { find } from "./find.js"
import { update } from "./update.js"

type ModelMetaOptions<IdFieldName extends string> = {
    idFieldName?: IdFieldName
}

// const context: FileDbContext<T> = {
//     store,
//     relationships,
//     dependents: createDependentsMap(relationships),
//     idFieldName: idFieldName ?? "id",
//     reuseExisting: reuseExisting ?? {}
// }

type User = {
    name: string
    friends: User[]
    groups: Group[]
}

type Group = {
    name: string
    description: string
    users: User[]
}

const fallback = {
    users: [] as User[],
    groups: [] as Group[]
}

type Test = typeof fallback

const x: Model<Test> = {
    users: []
}

export type CandidateModelPaths<Input extends object> = Leaves<
    Input,
    { filter: object[]; treatAsLeaf: object[] }
>

export type Model<Input extends object> = {
    [K in CandidateModelPaths<Input>]?: {
        [K2 in keyof ValueAtPath<Input, K>]: {}
    }
} & { _meta?: ModelMetaOptions<any> }

export const createModelMiddleware = <
    Input extends object,
    M extends Model<Input>
>({
    _meta,
    ...model
}: M) => {
    const context = {} as any
    return transform(model, ([k, v]: [string, any]) => [
        k,
        {
            create: (o: any, options?: CreateOptions<any>) =>
                create(k, o, context, options),
            all: (options: InteractionOptions<any> = {}) =>
                find(k, (_) => true, context, {
                    unpack: options.unpack ?? true,
                    exactlyOne: false
                }),
            find: (by: FindBy<T>, options: InteractionOptions<any> = {}) =>
                find(k, by, context, { unpack: options.unpack ?? true }),
            filter: (by: FindBy<T>, options: InteractionOptions<any> = {}) =>
                find(k, by, context, {
                    unpack: options.unpack ?? true,
                    exactlyOne: false
                }),
            remove: (by: FindBy<T>, options: RemoveOptions = {}) =>
                remove(k, by, context, options),
            update: (where: FindBy<T>, changes: DeepUpdate<T>) =>
                update(k, where, changes, context)
        }
    ]) as any
}

// export type FileDb<T extends Model, IdFieldName extends string = "id"> = {
//     all: () => ShallowModel<T, IdFieldName>
// } & {
//     [K in keyof T]: Interactions<Unlisted<T[K]>, IdFieldName>
// }

export type Interactions<O extends object, IdFieldName extends string> = {
    create: <U extends boolean = true>(
        o: O,
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>
    all: <U extends boolean = true>(
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>[]
    find: <U extends boolean = true>(
        by: FindBy<Data<O, IdFieldName, U>>,
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>
    filter: <U extends boolean = true>(
        by: FindBy<Data<O, IdFieldName, U>>,
        options?: InteractionOptions<U>
    ) => Data<O, IdFieldName, U>[]
    remove: <U extends boolean = true>(
        by: FindBy<Data<O, IdFieldName, U>>,
        options?: RemoveOptions
    ) => void
    update: (
        by: FindBy<Data<O, IdFieldName, false>>,
        update: DeepUpdate<Data<O, IdFieldName, false>>
    ) => void
}
