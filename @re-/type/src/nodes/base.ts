import type { Dictionary, NormalizedJsTypeName } from "@re-/tools"
import { chainableNoOpProxy, jsTypeOf, keySet } from "@re-/tools"
import type { DynamicArktype } from "../type.js"
import { Check } from "./traverse/check.js"
import { Diagnostic } from "./traverse/diagnostics.js"

export namespace Base {
    export type UnknownNode = Node<string, UnknownNode[] | undefined>

    export abstract class Node<
        Kind extends string,
        Children extends UnknownNode[] | undefined
    > implements DynamicArktype
    {
        abstract children: Children
        abstract hasStructure: boolean
        abstract readonly kind: Kind

        check(data: unknown) {
            const state = new Check.State(data)
            this.allows(state)
            return state.errors.length
                ? {
                      errors: state.errors
                  }
                : { data }
        }

        assert(data: unknown) {
            const result = this.check(data)
            result.errors?.throw()
            return result.data
        }

        get infer() {
            return chainableNoOpProxy
        }

        abstract allows(state: Check.State): void

        addError(state: Check.State, context: any) {
            state.errors.push()
        }

        precondition?: Precondition

        abstract toString(): string
        abstract get mustBe(): string
        abstract get ast(): unknown
        /**
         * This generates an isomorphic definition that can be parsed and
         * inverted. The preferred isomorphic format for expressions is the
         * string form over the tuple form:
         *
         * Terminal => string
         * Structural => object
         * NonTerminal => Any structural descendants ? [tuple-form expression] : "string-form expression"
         *
         * For example, the input definitions...
         *
         *     "string|number" (string form)
         *         and
         *     ["string", "|", "number"] (tuple form)
         *
         * both result in a toDefinition() output of "string|number".
         *
         * However, if the input definition was:
         *
         *     [{ a: ["string", "?"] }, "&", { b: ["boolean", "?"] }]
         *
         * Since the structural (in this case object literal) definitions cannot
         * be stringified as a defininition, toDefintion() would yield:
         *
         *     [{a: "string?"}, "&", {b: "boolean?"}]
         */
        abstract definition: unknown
    }
}

export type Precondition = "string" | "number" | "object" | "array"

export const pathToString = (path: string[]) =>
    path.length === 0 ? "/" : path.join("/")

const vowels = keySet({ a: 1, e: 1, i: 1, o: 1, u: 1 })

export const addArticle = (phrase: string) =>
    (phrase[0] in vowels ? "an " : "a ") + phrase
