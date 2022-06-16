import { isDigits, uncapitalize } from "@re-/tools"
import { Parser } from "../parser.js"
import { stringifyDef, stringifyValue } from "../utils.js"
import { Traverse } from "./traverse.js"

export type CustomValidator = Allows.CustomValidator

export namespace Allows {
    export type Options = {
        ignoreExtraneousKeys?: boolean
        validator?: CustomValidator | "default"
        verbose?: boolean
    }

    export type CustomValidator = (
        args: CustomValidatorArgs
    ) => undefined | string | ErrorsByPath

    export type CustomValidatorArgs = {
        def: unknown
        value: unknown
        getOriginalErrors: () => ErrorsByPath
        path: string
    }

    export type Args = {
        value: unknown
        errors: ErrorTree
        cfg: Config
        ctx: Traverse.Context
    }

    export class ValidationError extends Error {}

    export const buildUnassignableErrorMessage = (
        def: unknown,
        value: unknown
    ) => `${stringifyValue(value)} is not assignable to ${stringifyDef(def)}.`

    export const customValidatorAllows = (
        validator: CustomValidator,
        node: Parser.Node,
        args: Args
    ) => {
        const customErrors = validator({
            value: args.value,
            path: args.ctx.path,
            def: node.def,
            getOriginalErrors: () => {
                const branchedErrors = args.errors.split(args.ctx.path)
                const originalErrors = branchedErrors.branch("original")
                node.allows({
                    ...args,
                    cfg: { ...args.cfg, validator: "default" },
                    errors: originalErrors
                })
                return originalErrors.all()
            }
        })
        if (typeof customErrors === "string") {
            args.errors.add(args.ctx.path, customErrors)
        }
        if (typeof customErrors === "object") {
            args.errors.assign(customErrors)
        }
    }

    export type ErrorsByPath = Record<string, string>

    export class ErrorBrancher {
        private branches: Record<string, ErrorTree> = {}

        constructor(private parent: ErrorTree, private path: string) {}

        branch(name: string) {
            const branchErrors = new ErrorTree()
            this.branches[name] = branchErrors
            return branchErrors
        }

        prune(name: string) {
            delete this.branches[name]
        }

        merge(name: string) {
            this.parent.add(this.path, this.branches[name].toString())
        }

        mergeAll(summary: string) {
            let message = summary
            for (const [name, errors] of Object.entries(this.branches)) {
                message += `\n${name}: ${errors.toString()}`
            }
            this.parent.add(this.path, message)
        }
    }

    export class ErrorTree {
        private errors: ErrorsByPath = {}

        get count() {
            return Object.keys(this.errors).length
        }

        isEmpty() {
            return this.count === 0
        }

        add(path: string, message: string) {
            this.errors[path] = message
        }

        assign(errors: ErrorsByPath) {
            Object.assign(this.errors, errors)
        }

        has(path: string) {
            return path in this.errors
        }

        get(path: string) {
            return this.errors[path]
        }

        delete(path: string) {
            delete this.errors[path]
        }

        all() {
            return this.errors
        }

        split(path: string) {
            return new ErrorBrancher(this, path)
        }

        toString() {
            if (this.isEmpty()) {
                return ""
            }
            const entries = Object.entries(this.errors)
            if (entries.length === 1) {
                const [path, message] = entries[0]
                if (path) {
                    return `At ${
                        isDigits(path) ? "index" : "path"
                    } ${path}, ${uncapitalize(message)}`
                }
                return message
            } else {
                let aggregatedMessage =
                    "Encountered errors at the following paths:\n"
                for (const [path, message] of entries) {
                    aggregatedMessage += `  ${path}: ${message}\n`
                }
                return aggregatedMessage
            }
        }
    }

    export const createArgs = (
        value: unknown,
        options?: Options
    ): Allows.Args => ({
        value,
        errors: new ErrorTree(),
        ctx: Traverse.createContext(),
        cfg: options ?? {}
    })

    export type Config = Options
}
