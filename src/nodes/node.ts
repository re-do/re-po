import type { Dict, evaluate } from "@arktype/utils"
import { CompiledFunction } from "@arktype/utils"
import type { CompilationContext } from "../compile/compile.js"
import {
    createCompilationContext,
    InputParameterName
} from "../compile/compile.js"
import { arkKind } from "../compile/registry.js"
import type { inferred } from "../parse/definition.js"
import type { ParseContext } from "../scope.js"
import type { NodeKind, NodeKinds } from "./kinds.js"
import type { BasisKind } from "./primitive/basis/basis.js"

export interface BaseNodeConfig {
    kind: NodeKind
    rule: unknown
    meta: Dict
}

export interface BaseNodeImplementation<node extends BaseNode> {
    kind: node["kind"]
    compile: (rule: node["rule"], ctx: CompilationContext) => string
}

export type NodeExtensions<node extends BaseNode> = (
    base: basePropsOf<node>
) => extendedPropsOf<node>

export type basePropsOf<node extends BaseNode> = Pick<node, BuiltinBaseKey>

export type extendedPropsOf<
    node extends BaseNode,
    additionalBuiltinKey extends PropertyKey = never
> = Omit<
    node,
    // we don't actually need the inferred symbol at runtime
    additionalBuiltinKey | BuiltinBaseKey | typeof inferred
> &
    ThisType<node>

interface PreconstructedBase<config extends BaseNodeConfig> {
    readonly [arkKind]: "node"
    readonly kind: config["kind"]
    readonly rule: config["rule"]
    readonly source: string
    readonly condition: string
    readonly alias: string
    readonly context: ParseContext
    compile(ctx: CompilationContext): string
    // TODO: test with cyclic nodes
    allows(data: unknown): boolean
    hasKind<kind extends NodeKind>(kind: kind): this is NodeKinds[kind]
    isBasis(): this is NodeKinds[BasisKind]
}

type BuiltinBaseKey = evaluate<keyof PreconstructedBase<BaseNodeConfig>>

type NodeExtensionProps = {
    description: string
}

export type BaseNode<config extends BaseNodeConfig = BaseNodeConfig> =
    PreconstructedBase<config> & NodeExtensionProps

export type NodeConstructor<node extends BaseNode> = (
    input: "input" extends keyof node ? node["input"] : node["rule"],
    ctx: ParseContext
) => node

export const alphabetizeByCondition = <nodes extends BaseNode[]>(
    nodes: nodes
) => nodes.sort((l, r) => (l.condition > r.condition ? 1 : -1))

export const defineNode = <node extends BaseNode<any>>(
    def: BaseNodeImplementation<node>,
    extensions: NodeExtensions<node>
): NodeConstructor<node> => {
    const nodeCache: {
        [condition: string]: node | undefined
    } = {}
    const isBasis =
        def.kind === "domain" || def.kind === "class" || def.kind === "value"
    return (rule, ctx) => {
        const source = def.compile(
            rule,
            createCompilationContext("out", "problems")
        )
        if (nodeCache[source]) {
            return nodeCache[source]!
        }
        const condition = def.compile(
            rule,
            createCompilationContext("true", "false")
        )
        const baseAlias = `${ctx.baseName}${ctx.path
            .map((k) => `${k[0].toUpperCase()}${k.slice(1)}`)
            .join("")}`
        let alias = baseAlias
        let suffix = 2
        while (alias in nodeCache) {
            alias = `${baseAlias}${suffix++}`
        }
        const base: PreconstructedBase<BaseNodeConfig> = {
            [arkKind]: "node",
            kind: def.kind,
            alias,
            context: { ...ctx },
            hasKind: (kind) => kind === def.kind,
            isBasis: () => isBasis,
            source,
            condition,
            rule,
            compile: (ctx: CompilationContext) => def.compile(rule, ctx),
            allows: new CompiledFunction(
                InputParameterName,
                `${condition}
            return true`
            )
        }
        const instance = Object.assign(extensions(base as node), base, {
            toString: () => instance.description
        }) as node
        nodeCache[source] = instance
        return instance
    }
}
