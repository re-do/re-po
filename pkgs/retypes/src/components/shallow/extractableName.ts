import { createParser } from "../parser.js"
import { BuiltIn } from "./builtIn.js"
import { typeDefProxy } from "../../common.js"
import { validationError } from "../errors.js"

// These are the non-literal types we can extract from a value at runtime
export namespace ExtractableName {
    export type Definition<Def extends keyof Map = keyof Map> = Def

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => BuiltIn.parse,
        matches: (definition) => definition in map,
        implements: {
            allows: (definition, { path }, assignment) =>
                definition === assignment
                    ? {}
                    : validationError({ definition, assignment, path })
        }
    })

    export const delegate = parse as any as Definition

    export const map = {
        bigint: BigInt(0),
        true: true as true,
        false: false as false,
        null: null,
        symbol: Symbol(),
        undefined: undefined,
        function: (...args: any[]) => null as any
    }

    export type Map = typeof map
}
