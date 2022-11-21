import type { ScopeRoot } from "../../../../scope.js"
import { isEmpty } from "../../../../utils/deepEquals.js"
import { pathToSegments } from "../../../../utils/paths.js"
import { throwInternalError } from "../../../errors.js"
import type { Attribute, AttributePath, Attributes } from "../attributes.js"
import { exclude, intersect } from "../operations.js"
import { compress } from "./compress.js"
import type { DiscriminatedKey } from "./discriminate.js"

export const pruneBranches = (
    base: Attributes,
    given: Attributes,
    scope: ScopeRoot
) => {
    if (!base.branches) {
        return base
    }
    if (base.branches[0] === "?") {
        return throwInternalError(unexpectedDiscriminatedBranchesMessage)
    }
    let result = base
    const unions =
        base.branches[0] === "|"
            ? [base.branches[1]]
            : base.branches[1].map((intersectedBranches) =>
                  intersectedBranches[0] === "?"
                      ? throwInternalError(
                            unexpectedDiscriminatedBranchesMessage
                        )
                      : intersectedBranches[1]
              )
    for (const union of unions) {
        const unionBase = pruneUnionToBase(union, given, scope)
        if (unionBase) {
            result = intersect(base, unionBase, scope)
        }
    }
    return result
}

const unexpectedDiscriminatedBranchesMessage =
    "Unexpected attempt to prune discriminated branches"

export const pruneUnionToBase = (
    union: Attributes[],
    given: Attributes,
    scope: ScopeRoot
) => {
    for (let i = 0; i < union.length; i++) {
        const remainingBranchAttributes = exclude(union[i], given)
        if (remainingBranchAttributes === null) {
            // If any of the branches is empty, assign is a subtype of
            // the branch and the branch will always be fulfilled. In
            // that scenario, we can safely remove all branches in that set.
            return
        }
        union[i] = remainingBranchAttributes
    }
    return compress(union, scope)
}

export const pruneDiscriminant = <k extends DiscriminatedKey>(
    attributes: Attributes,
    path: AttributePath<k>
) => {
    const segments = pathToSegments(path)
    const key = segments.pop() as k
    const traversal = traverseToDiscriminant(attributes, segments)
    if (!traversal.complete) {
        return
    }
    const top = traversal.traversed.pop()!
    const value = top[key]
    if (value === undefined) {
        return
    }
    delete top[key]
    pruneTraversedSegments(traversal.traversed, segments)
    return value
}

export const unpruneDiscriminant = <k extends DiscriminatedKey>(
    attributes: Attributes,
    path: AttributePath<k>,
    value: Attribute<k>
) => {
    const segments = pathToSegments(path)
    const key = segments.pop() as k
    let currentAttributes = attributes
    for (const segment of segments) {
        currentAttributes.props ??= {}
        currentAttributes.props[segment] ??= {}
        currentAttributes = currentAttributes.props[segment]
    }
    currentAttributes[key] = value
}

type AttributeTraversal = {
    traversed: Attributes[]
    complete: boolean
}

const traverseToDiscriminant = (
    root: Attributes,
    segments: string[]
): AttributeTraversal => {
    const traversed: Attributes[] = [root]
    let top: Attributes = root
    for (const segment of segments) {
        if (!top.props?.[segment]) {
            return { traversed, complete: false }
        }
        top = top.props[segment]
        traversed.push(top)
    }
    return {
        traversed,
        complete: true
    }
}

const pruneTraversedSegments = (
    traversed: Attributes[],
    segments: string[]
) => {
    for (let i = traversed.length - 1; i >= 0; i--) {
        const traversedProps = traversed[i].props!
        if (!isEmpty(traversedProps[segments[i]])) {
            return
        }
        delete traversedProps[segments[i]]
        if (!isEmpty(traversedProps)) {
            return
        }
        delete traversed[i].props
    }
}
