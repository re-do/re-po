import type { Base } from "../../base.js"
import type { Check } from "../../traverse/check.js"
import type { Diagnostics } from "../../traverse/diagnostics.js"
import { Branching } from "./branching.js"

export namespace Union {
    export const allows: Base.AllowsFn<Node> = () => {
        // const branchDiagnosticsEntries: BranchDiagnosticsEntry[] = []
        // const rootErrors = state.errors
        // state.unionDepth++
        // for (const child of this.children) {
        //     state.errors = new Diagnostics(state)
        //     child.allows(state)
        //     if (!state.errors.length) {
        //         break
        //     }
        //     branchDiagnosticsEntries.push([child.toString(), state.errors])
        // }
        // state.unionDepth--
        // state.errors = rootErrors
        // if (branchDiagnosticsEntries.length === this.children.length) {
        //     return
        // }
    }

    export class Node extends Branching.Node<"|"> {
        readonly token = "|"
        readonly kind = "union"

        buildBranchDiagnosticsExplanation = (
            branchDiagnosticsEntries: BranchDiagnosticsEntry[]
        ) => {
            let branchDiagnosticSummary = ":"
            for (const [
                branchDefinition,
                branchDiagnostics
            ] of branchDiagnosticsEntries) {
                branchDiagnosticSummary += `\n${branchDefinition}: ${branchDiagnostics.summary}`
            }
            return branchDiagnosticSummary
        }
    }

    export type BranchDiagnosticsEntry = [string, Diagnostics]
}
