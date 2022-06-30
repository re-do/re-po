import { Base } from "../base.js"

export namespace Literal {
    export type Definition = number | bigint | boolean | undefined | null

    export const matches = (def: unknown): def is Definition =>
        def === null ||
        typeof def === "undefined" ||
        typeof def === "boolean" ||
        typeof def === "number" ||
        typeof def === "bigint"

    export class Node extends Base.Leaf<Definition> {
        defToString() {
            return this.stringifyDef()
        }

        allows(args: Base.Validation.Args) {
            if (args.value !== this.def) {
                this.addUnassignable(args)
            }
        }

        generate() {
            return this.def
        }
    }
}
