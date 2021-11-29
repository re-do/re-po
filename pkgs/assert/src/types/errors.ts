import {
    memoize,
    LinePosition,
    getLinePositions,
    SourceRange,
    stringify
} from "@re-do/utils"
import { getTsContext } from "./ts.js"

type TypeError = {
    from: LinePosition
    to: LinePosition
    message: string
}

// Maps fileNames to a list objects representing errors
type ErrorsByFile = Record<string, TypeError[]>

export type TypeErrorsOptions = {}

export const typeErrorChecker =
    ({ file, from, to }: SourceRange) =>
    (options: TypeErrorsOptions = {}) => {
        const errorsInFile = getTypeErrors()[file]
        const errorsAfterCall = errorsInFile.filter(
            (error) =>
                error.from.line > from.line ||
                (error.from.line === from.line &&
                    error.from.column >= from.column)
        )
        const errorsInRange = errorsAfterCall.filter(
            (error) =>
                error.to.line < to.line ||
                (error.to.line === to.line && error.to.column <= to.column)
        )
        return errorsInRange.map((_) => _.message)
    }

export const getTypeErrors = memoize(() => {
    const { ts, sources } = getTsContext()
    console.log(`Compiling type errors for the following files:
${Object.keys(sources).join("\n")}`)
    const diagnostics = ts
        .getSemanticDiagnostics()
        .concat(ts.getSyntacticDiagnostics())
    const errors = diagnostics.reduce(
        (errors, { file, start = 0, length = 1, messageText }) => {
            if (!file?.fileName || !sources[file.fileName]) {
                return errors
            }
            const [from, to] = getLinePositions(sources[file.fileName], [
                start,
                start + length - 1
            ])
            return {
                ...errors,
                [file.fileName]: (errors[file.fileName] ?? []).concat({
                    from,
                    to,
                    message:
                        typeof messageText === "string"
                            ? messageText
                            : messageText.messageText
                })
            }
        },
        {} as ErrorsByFile
    )
    console.log("✅")
    return errors
})
