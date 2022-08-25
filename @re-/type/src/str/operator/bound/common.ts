export * from "../common.js"
import { Node } from "../common.js"
import type { Comparator } from "./parse.js"

export type boundChecker = (y: number) => boolean

export type normalizedBound = [Comparator, number]

export const createBoundChecker = ([token, x]: normalizedBound) => {
    switch (token) {
        case "<=":
            return (y: number) => y <= x
        case ">=":
            return (y: number) => y >= x
        case "<":
            return (y: number) => y < x
        case ">":
            return (y: number) => y > x
        case "==":
            return (y: number) => y === x
        default:
            throw new Error(`Unexpected comparator ${token}.`)
    }
}

export interface boundableNode extends Node.base {
    boundBy?: string
    toBound(value: unknown): number
}

export type BoundableValue = number | string | unknown[]

export const isBoundable = (node: Node.base): node is boundableNode =>
    "toBound" in node

export type boundValidationError = {
    comparator: Comparator
    limit: number
    actual: number
    source: BoundableValue
}
