import type { Scope } from "../../scope.js"
import { throwInternalError } from "../../utils/internalArktypeError.js"
import { buildUnmatchedGroupCloseMessage, throwParseError } from "../errors.js"
import { unclosedGroupMessage } from "../operand/groupOpen.js"
import { buildUnpairedLeftBoundMessage } from "../operator/bounds/left.js"
import type { Attributes } from "./attributes/attributes.js"
import type { MorphName } from "./attributes/morph.js"
import { morphisms, toArray } from "./attributes/morph.js"
import { Scanner } from "./scanner.js"

export type OpenRange = [limit: number, comparator: Scanner.PairableComparator]

type BranchState = {
    range?: OpenRange
    "&": Attributes[]
    "|": Attributes[]
}

export class DynamicState {
    public readonly scanner: Scanner
    private root: Attributes | undefined
    private branches: BranchState = {
        "&": [],
        "|": []
    }
    private groups: BranchState[] = []

    constructor(def: string, public readonly scope: Scope) {
        this.scanner = new Scanner(def)
    }

    error(message: string) {
        return throwParseError(message)
    }

    hasRoot() {
        return this.root !== undefined
    }

    private assertHasRoot() {
        if (this.root === undefined) {
            return throwInternalError("Unexpected interaction with unset root")
        }
    }

    private assertUnsetRoot() {
        if (this.root !== undefined) {
            return throwInternalError("Unexpected attempt to overwrite root")
        }
    }

    setRoot(attributes: Attributes) {
        this.assertUnsetRoot()
        this.root = attributes
    }

    morphRoot(to: MorphName) {
        this.assertHasRoot()
        this.root = morphisms[to](this.root!)
    }

    private ejectRoot() {
        this.assertHasRoot()
        const root = this.root
        this.root = undefined
        return root!
    }

    finalize() {
        if (this.groups.length) {
            return this.error(unclosedGroupMessage)
        }
        this.finalizeBranches()
        return this.ejectRoot()
    }

    finalizeBranches() {
        this.assertRangeUnset()
        if (this.branches["&"]) {
            this.mergeIntersection()
        }
        if (this.branches["|"]) {
            this.mergeUnion()
        }
    }

    finalizeGroup() {
        this.finalizeBranches()
        const topBranchState = this.groups.pop()
        if (!topBranchState) {
            return this.error(
                buildUnmatchedGroupCloseMessage(this.scanner.unscanned)
            )
        }
        this.branches = topBranchState
    }

    pushBranch(token: Scanner.BranchToken) {
        this.assertRangeUnset()
        this.branches[token].push(this.ejectRoot())
    }

    private assertRangeUnset() {
        if (this.branches.range) {
            return this.error(
                buildUnpairedLeftBoundMessage(
                    this.branches.range[0],
                    this.branches.range[1]
                )
            )
        }
    }

    private mergeIntersection() {}

    private mergeUnion() {}

    private previousOperator() {
        return this.branches.range?.[1] ?? this.branches["&"].length
            ? "&"
            : this.branches["|"].length
            ? "|"
            : undefined
    }
}

const compileIntersection = (branches: Attributes[]) => {
    // while (branches.length > 1) {
    //     branches.unshift(intersect(branches.pop()!, branches.pop()!))
    // }
    return branches[0]
}

const unsetProxy = new Proxy(
    {},
    {
        get: () =>
            throwInternalError(`Unexpected attempt to access unset attributes.`)
    }
)
