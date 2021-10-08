export {}
import {
    FlatUnlisted,
    IsList,
    isRecursible,
    MinusOne,
    TransformCyclic,
    NonRecursible,
    And,
    Segment,
    Join,
    DefaultDelimiter,
    Cast,
    Split,
    ListPossibleTypes,
    ElementOf,
    PropertyOf,
    Evaluate,
    Stringifiable,
    ValueOf
} from "./common.js"
import { WithDefaults, withDefaults } from "./merge.js"

export type ValueAtPath<
    O,
    P extends string,
    Options extends ValueAtPathOptions = {}
> = ValueAtPathList<
    O,
    Split<P, EnsureValue<Options["delimiter"], "/">>,
    EnsureValue<Options["excludeArrayIndices"], false>
>

export type ValueAtPathList<
    O,
    Segments extends Segment[],
    ExcludeArrayIndices extends boolean = false
> = And<ExcludeArrayIndices, IsList<O>> extends true
    ? ValueAtPathList<FlatUnlisted<O>, Segments, ExcludeArrayIndices>[]
    : Segments extends [infer Current, ...infer Remaining]
    ? Current extends keyof O
        ? ValueAtPathList<
              O[Current],
              Remaining extends string[] ? Remaining : never,
              ExcludeArrayIndices
          >
        : undefined
    : O

export type ValueAtPathOptions = {
    delimiter?: string
    excludeArrayIndices?: boolean
}

export const valueAtPath = <
    O,
    P extends PathOf<O, Options>,
    Options extends ValueAtPathOptions = {}
>(
    o: O,
    path: P,
    options?: Options
): ValueAtPath<O, P, Options> => {
    const { delimiter, excludeArrayIndices } = withDefaults<ValueAtPathOptions>(
        {
            delimiter: "/",
            excludeArrayIndices: false
        }
    )(options)
    return valueAtPathList(
        o,
        (path as string).split(delimiter),
        excludeArrayIndices
    ) as any
}

export const valueAtPathList = <
    O,
    P extends Segment[],
    ExcludeArrayIndices extends boolean = false
>(
    o: O,
    segments: P,
    excludeArrayIndices: boolean = false
): ValueAtPathList<O, P, ExcludeArrayIndices> => {
    if (Array.isArray(o) && excludeArrayIndices) {
        return o.map((_) =>
            valueAtPathList(_, segments, excludeArrayIndices)
        ) as any
    }
    if (!segments.length) {
        return o as any
    }
    const [segment, ...remaining] = segments
    if (isRecursible(o) && segment in o) {
        return valueAtPathList(
            (o as any)[segment],
            remaining,
            excludeArrayIndices
        ) as any
    } else {
        return undefined as any
    }
}

export type Fallback<Value, Default> = unknown extends Value ? Default : Value
export type EnsureValue<Value, Default> = NonNullable<Fallback<Value, Default>>

export type PathConstraintOptions = {
    filter?: any
    exclude?: any
    treatAsLeaf?: any
    excludeArrayIndices?: boolean
    maxDepth?: number
}

export type PathConstraints = Required<PathConstraintOptions>

export type DefaultPathConstraints = {
    filter: any
    exclude: never
    treatAsLeaf: never
    excludeArrayIndices: false
    maxDepth: 10
}

export type StringPathConstraintOptions = PathConstraintOptions & {
    delimiter?: string
}

export type LeafListOf<
    T,
    ProvidedConstraints extends PathConstraintOptions = {},
    Constraints extends PathConstraints = WithDefaults<
        PathConstraintOptions,
        ProvidedConstraints,
        DefaultPathConstraints
    >
> = Cast<
    LeafListOfRecurse<
        T,
        Constraints,
        EnsureValue<
            Constraints["maxDepth"],
            DefaultPathConstraints["maxDepth"]
        >,
        never,
        []
    >,
    Segment[]
>

type LeafListOfRecurse<
    T,
    Constraints extends Required<PathConstraintOptions>,
    DepthRemaining extends number,
    Seen,
    Path extends Segment[]
> = DepthRemaining extends 0
    ? never
    : T extends NonRecursible | Constraints["treatAsLeaf"]
    ? T extends Constraints["exclude"]
        ? never
        : T extends Constraints["filter"]
        ? Path
        : never
    : And<IsList<T>, Constraints["excludeArrayIndices"]> extends true
    ? LeafListOfRecurse<
          FlatUnlisted<T>,
          Constraints,
          MinusOne<DepthRemaining>,
          Seen,
          Path
      >
    : T extends Seen
    ? never
    : ValueOf<
          {
              [K in keyof T]: LeafListOfRecurse<
                  T[K],
                  Constraints,
                  MinusOne<DepthRemaining>,
                  Seen | T,
                  [...Path, K & Segment]
              >
          }
      >

export type LeafOf<
    T,
    Constraints extends StringPathConstraintOptions = {}
> = Join<
    LeafListOf<T, Constraints>,
    EnsureValue<Constraints["delimiter"], DefaultDelimiter>
>

export type PathListFromLeafList<Segments extends Segment[]> =
    Segments extends []
        ? never
        :
              | Segments
              | (Segments extends [...infer Remaining, Segment]
                    ? PathListFromLeafList<
                          Remaining extends Segment[] ? Remaining : never
                      >
                    : never)

export type PathListOf<
    T,
    Constraints extends PathConstraintOptions = {}
> = PathListFromLeafList<LeafListOf<T, Constraints>>

export type PathOf<
    T,
    Constraints extends StringPathConstraintOptions = {}
> = Join<
    PathListOf<T, Constraints>,
    EnsureValue<Constraints["delimiter"], DefaultDelimiter>
>

export type PathListTo<
    T,
    To,
    Constraints extends Omit<
        PathConstraintOptions,
        "filter" | "treatAsLeaf"
    > = {}
> = LeafListOf<T, { filter: To; treatAsLeaf: To } & Constraints>

export type PathTo<
    T,
    To,
    Constraints extends Omit<
        StringPathConstraintOptions,
        "filter" | "treatAsLeaf"
    > = {}
> = LeafOf<T, { filter: To; treatAsLeaf: To } & Constraints>

export type CyclicPathList<
    T,
    Constraints extends Omit<
        PathConstraintOptions,
        "filter" | "treatAsLeaf"
    > = {}
> = PathListTo<TransformCyclic<T, "__cycle__">, "__cycle__", Constraints>

export type CyclicPath<
    T,
    Constraints extends Omit<
        StringPathConstraintOptions,
        "filter" | "treatAsLeaf"
    > = {}
> = PathTo<TransformCyclic<T, "__cycle__">, "__cycle__", Constraints>
