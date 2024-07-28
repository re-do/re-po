import {
	$ark,
	DynamicBase,
	ParseError,
	bound,
	flatMorph,
	hasDomain,
	isArray,
	printable,
	throwInternalError,
	throwParseError,
	type Dict,
	type Json,
	type anyOrNever,
	type array,
	type flattenListable,
	type show
} from "@ark/util"
import {
	resolveConfig,
	type ArkConfig,
	type ResolvedArkConfig
} from "./config.js"
import {
	GenericRoot,
	LazyGenericBody,
	type GenericHktSchemaParser,
	type GenericParamDef
} from "./generic.js"
import type { inferRoot, validateRoot } from "./inference.js"
import type { internal } from "./keywords/internal.js"
import type { jsObjects } from "./keywords/jsObjects.js"
import type { tsKeywords } from "./keywords/tsKeywords.js"
import {
	nodeImplementationsByKind,
	type Node,
	type NodeSchema,
	type RootSchema,
	type reducibleKindOf
} from "./kinds.js"
import { RootModule, type PreparsedNodeResolution } from "./module.js"
import type { BaseNode } from "./node.js"
import {
	parseNode,
	registerNodeId,
	schemaKindOf,
	type NodeParseOptions
} from "./parse.js"
import { normalizeAliasSchema, type AliasNode } from "./roots/alias.js"
import type { BaseRoot } from "./roots/root.js"
import { CompiledFunction, NodeCompiler } from "./shared/compile.js"
import type { NodeKind, RootKind } from "./shared/implement.js"
import type { TraverseAllows, TraverseApply } from "./shared/traversal.js"
import { arkKind, hasArkKind, isNode } from "./shared/utils.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: BaseRoot }

export type BaseResolutions = Record<string, BaseRoot>

export type InternalResolutions = Record<string, InternalResolution | undefined>

export type exportedNameOf<$> = Exclude<keyof $ & string, PrivateDeclaration>

export type resolvableReferenceIn<$> =
	keyof $ extends infer k extends string ?
		k extends PrivateDeclaration<infer alias> ?
			alias
		:	k
	:	never

export type resolveReference<reference extends resolvableReferenceIn<$>, $> =
	reference extends keyof $ ? $[reference] : $[`#${reference}` & keyof $]

export type PrivateDeclaration<key extends string = string> = `#${key}`

type toInternalScope<$> = BaseScope<{
	[k in keyof $]: $[k] extends { [arkKind]: infer kind } ?
		[$[k]] extends [anyOrNever] ? BaseRoot
		: kind extends "generic" ? GenericRoot
		: kind extends "module" ? InternalRootModule
		: never
	:	BaseRoot
}>

// these allow builtin types to be accessed during parsing without cyclic imports
// they are populated as each scope is parsed with `intrinsic` in its config
export interface IntrinsicKeywords extends tsKeywords, jsObjects, internal {}

export type InternalResolution = BaseRoot | GenericRoot | InternalRootModule

type CachedResolution = string | InternalResolution

const schemaBranchesOf = (schema: object) =>
	isArray(schema) ? schema
	: "branches" in schema && isArray(schema.branches) ? schema.branches
	: undefined

const throwMismatchedNodeRootError = (expected: NodeKind, actual: NodeKind) =>
	throwParseError(
		`Node of kind ${actual} is not valid as a ${expected} definition`
	)

export const writeDuplicateAliasError = <alias extends string>(
	alias: alias
): writeDuplicateAliasError<alias> =>
	`#${alias} duplicates public alias ${alias}`

export type writeDuplicateAliasError<alias extends string> =
	`#${alias} duplicates public alias ${alias}`

export type AliasDefEntry = [name: string, defValue: unknown]

const scopesById: Record<string, BaseScope | undefined> = {}

$ark.intrinsic = {} as never

export abstract class BaseScope<
	$ extends InternalResolutions = InternalResolutions
> {
	readonly config: ArkConfig
	readonly resolvedConfig: ResolvedArkConfig
	readonly id = `${Object.keys(scopesById).length}$`
	readonly [arkKind] = "scope"

	readonly referencesById: { [id: string]: BaseNode } = {}
	references: readonly BaseNode[] = []
	protected readonly resolutions: {
		[alias: string]: CachedResolution | undefined
	} = {}
	readonly json: Json = {}
	exportedNames: string[] = []
	readonly aliases: Record<string, unknown> = {}
	protected resolved = false

	constructor(
		/** The set of names defined at the root-level of the scope mapped to their
		 * corresponding definitions.**/
		def: Record<string, unknown>,
		config?: ArkConfig
	) {
		this.config = config ?? {}
		this.resolvedConfig = resolveConfig(config)

		const aliasEntries = Object.entries(def).map(entry =>
			this.preparseAlias(...entry)
		)

		aliasEntries.forEach(([k, v]) => {
			if (k[0] === "#") {
				const name = k.slice(1)
				if (name in this.aliases)
					throwParseError(writeDuplicateAliasError(name))
				this.aliases[name] = v
			} else {
				if (k in this.aliases) throwParseError(writeDuplicateAliasError(k))
				this.aliases[k] = v
				this.exportedNames.push(k)
			}
		}) as never

		if ($ark.ambient) {
			// ensure exportedResolutions is populated
			$ark.ambient.export()
			this.resolutions = {}
		}

		scopesById[this.id] = this
	}

	get internal(): this {
		return this
	}

	@bound
	defineSchema(def: RootSchema): RootSchema {
		return def
	}

	@bound
	schema(def: RootSchema, opts?: NodeParseOptions): BaseRoot {
		return this.node(schemaKindOf(def), def, opts)
	}

	@bound
	defineRoot(def: RootSchema): RootSchema {
		return this.defineSchema(def)
	}

	@bound
	generic(
		...params: array<GenericParamDef>
	): ReturnType<GenericHktSchemaParser> {
		const $: BaseScope = this as never
		return instantiateDef =>
			new GenericRoot(
				params,
				new LazyGenericBody(instantiateDef),
				$,
				$
			) as never
	}

	@bound
	units(values: array, opts?: NodeParseOptions): BaseRoot {
		const uniqueValues: unknown[] = []
		for (const value of values)
			if (!uniqueValues.includes(value)) uniqueValues.push(value)

		const branches = uniqueValues.map(unit => this.node("unit", { unit }, opts))
		return this.node("union", branches, {
			...opts,
			prereduced: true
		})
	}

	protected lazyResolutions: AliasNode[] = []
	lazilyResolve(resolve: () => BaseRoot, syntheticAlias?: string): AliasNode {
		const node = this.node(
			"alias",
			{
				alias: syntheticAlias ?? "synthetic",
				resolve
			},
			{ prereduced: true }
		)
		if (!this.resolved) this.lazyResolutions.push(node)
		return node
	}

	@bound
	node<
		kinds extends NodeKind | array<RootKind>,
		prereduced extends boolean = false
	>(
		kinds: kinds,
		nodeSchema: NodeSchema<flattenListable<kinds>>,
		opts = {} as NodeParseOptions<prereduced>
	): Node<
		prereduced extends true ? flattenListable<kinds>
		:	reducibleKindOf<flattenListable<kinds>>
	> {
		let kind: NodeKind =
			typeof kinds === "string" ? kinds : schemaKindOf(nodeSchema, kinds)

		let schema: unknown = nodeSchema

		if (isNode(schema) && schema.kind === kind)
			return schema.bindScope(this) as never

		if (kind === "alias" && !opts?.prereduced) {
			const resolution = this.resolveRoot(
				normalizeAliasSchema(schema as never).alias
			)
			schema = resolution
			kind = resolution.kind
		} else if (kind === "union" && hasDomain(schema, "object")) {
			const branches = schemaBranchesOf(schema)
			if (branches?.length === 1) {
				schema = branches[0]
				kind = schemaKindOf(schema)
			}
		}

		const impl = nodeImplementationsByKind[kind]
		const normalizedSchema = impl.normalize?.(schema) ?? schema
		// check again after normalization in case a node is a valid collapsed
		// schema for the kind (e.g. sequence can collapse to element accepting a Node)
		if (isNode(normalizedSchema)) {
			return normalizedSchema.kind === kind ?
					(normalizedSchema.bindScope(this) as never)
				:	throwMismatchedNodeRootError(kind, normalizedSchema.kind)
		}

		const id = registerNodeId(kind, opts)

		const node = parseNode(
			id,
			kind,
			normalizedSchema,
			this,
			opts ?? {}
		).bindScope(this)

		if (this.resolved) {
			// this node was not part of the original scope, so compile an anonymous scope
			// including only its references
			if (!this.resolvedConfig.jitless) bindCompiledScope(node.references)
		} else {
			// we're still parsing the scope itself, so defer compilation but
			// add the node as a reference
			Object.assign(this.referencesById, node.referencesById)
		}

		return node as never
	}

	protected finalizeRootArgs(opts: NodeParseOptions, resolve: () => BaseRoot) {
		const isResolution = opts.alias && opts.alias in this.aliases
		// if the definition being parsed is not a scope alias and is not a
		// generic instantiation (i.e. opts don't include args), add this as a resolution.
		// TODO: this.lazilyResolve(resolve)
		resolve
		if (!isResolution) opts.args ??= { this: $ark.intrinsic.unknown as never }

		return opts
	}

	resolveRoot(name: string): BaseRoot {
		return (
			this.maybeResolveRoot(name) ??
			throwParseError(writeUnresolvableMessage(name))
		)
	}

	maybeResolveRoot(name: string): BaseRoot | undefined {
		const result = this.maybeResolveGenericOrRoot(name)
		if (hasArkKind(result, "generic")) return
		return result
	}

	maybeResolveGenericOrRoot(name: string): BaseRoot | GenericRoot | undefined {
		const resolution = this.maybeResolve(name)
		if (hasArkKind(resolution, "module"))
			return throwParseError(writeMissingSubmoduleAccessMessage(name))
		return resolution
	}

	preparseRoot(def: unknown): unknown {
		return def
	}

	preparseAlias(k: string, v: unknown): AliasDefEntry {
		return [k, v]
	}

	maybeResolve(name: string): InternalResolution | undefined {
		const resolution = this.maybeShallowResolve(name)
		return typeof resolution === "string" ?
				this.node("alias", { alias: resolution }, { prereduced: true })
			:	resolution
	}

	maybeShallowResolve(name: string): CachedResolution | undefined {
		const cached = this.resolutions[name]
		if (cached) return cached
		const def = this.aliases[name] ?? $ark.ambient?.resolutions[name]

		if (!def) return this.maybeResolveSubalias(name)

		const preparsed = this.preparseRoot(def)
		if (hasArkKind(preparsed, "generic"))
			return (this.resolutions[name] = preparsed.bindScope(this))

		if (hasArkKind(preparsed, "module")) {
			return (this.resolutions[name] = new RootModule(
				flatMorph(preparsed, (alias, node) => [
					alias,
					(node as BaseRoot | GenericRoot).bindScope(this)
				])
			))
		}

		this.resolutions[name] = name
		return (this.resolutions[name] = this.parseRoot(preparsed, {
			alias: name
		}).bindScope(this))
	}

	/** If name is a valid reference to a submodule alias, return its resolution  */
	protected maybeResolveSubalias(
		name: string
	): BaseRoot | GenericRoot | undefined {
		return maybeResolveSubalias(this.aliases, name)
	}

	import<names extends exportedNameOf<$>[]>(
		...names: names
	): show<destructuredImportContext<$, names>> {
		return new RootModule(
			flatMorph(this.export(...names) as any, (alias, value) => [
				`#${alias}`,
				value
			]) as never
		) as never
	}

	private _exportedResolutions: InternalResolutions | undefined
	private _exports: RootExportCache | undefined
	export<names extends exportedNameOf<$>[]>(
		...names: names
	): show<destructuredExportContext<$, names>> {
		if (!this._exports) {
			this._exports = {}
			for (const name of this.exportedNames) {
				const resolution = this.maybeResolve(name)
				if (hasArkKind(resolution, "root")) {
					resolution.references
						.filter(node => node.hasKind("alias"))
						.forEach(aliasNode => {
							Object.assign(
								aliasNode.referencesById,
								aliasNode.resolution.referencesById
							)
							resolution.references.forEach(ref => {
								if (aliasNode.id in ref.referencesById)
									Object.assign(ref.referencesById, aliasNode.referencesById)
							})
						})
				}
				this._exports[name] = resolution as never
			}

			this.lazyResolutions.forEach(node => node.resolution)

			this._exportedResolutions = resolutionsOfModule(this, this._exports)

			Object.assign(this.json, resolutionsToJson(this._exportedResolutions))
			Object.assign(this.resolutions, this._exportedResolutions)
			if (this.config.intrinsic)
				Object.assign($ark.intrinsic, this._exportedResolutions)
			this.references = Object.values(this.referencesById)
			if (!this.resolvedConfig.jitless) bindCompiledScope(this.references)
			this.resolved = true
		}
		const namesToExport = names.length ? names : this.exportedNames
		return new RootModule(
			flatMorph(namesToExport, (_, name) => [
				name,
				this._exports![name]
			]) as never
		) as never
	}

	resolve<name extends exportedNameOf<$>>(
		name: name
	): destructuredExportContext<$, []>[name] {
		return this.export()[name] as never
	}

	abstract parseRoot(schema: any, opts?: NodeParseOptions): BaseRoot
}

const resolutionsToJson = (resolutions: InternalResolutions): Json =>
	flatMorph(resolutions, (k, v) => [
		k,
		hasArkKind(v, "root") || hasArkKind(v, "generic") ?
			v.json
		:	resolutionsToJson(v)
	])

const maybeResolveSubalias = (
	base: Dict,
	name: string
): BaseRoot | GenericRoot | undefined => {
	const dotIndex = name.indexOf(".")
	if (dotIndex === -1) return

	const dotPrefix = name.slice(0, dotIndex)
	const prefixSchema = base[dotPrefix]
	// if the name includes ".", but the prefix is not an alias, it
	// might be something like a decimal literal, so just fall through to return
	if (prefixSchema === undefined) return
	if (!hasArkKind(prefixSchema, "module"))
		return throwParseError(writeNonSubmoduleDotMessage(dotPrefix))

	const subalias = name.slice(dotIndex + 1)
	const resolution = prefixSchema[subalias]
	if (resolution === undefined) return

	if (hasArkKind(resolution, "module"))
		return maybeResolveSubalias(resolution, subalias)

	if (hasArkKind(resolution, "root") || hasArkKind(resolution, "generic"))
		return resolution

	throwInternalError(
		`Unexpected resolution for alias '${name}': ${printable(resolution)}`
	)
}

export type validateAliases<aliases> = {
	[k in keyof aliases]: aliases[k] extends PreparsedNodeResolution ? aliases[k]
	:	validateRoot<aliases[k], aliases>
}

export type instantiateAliases<aliases> = {
	[k in keyof aliases]: aliases[k] extends PreparsedNodeResolution ? aliases[k]
	:	inferRoot<aliases[k], aliases>
} & unknown

export const schemaScope = <const aliases>(
	aliases: validateAliases<aliases>,
	config?: ArkConfig
): SchemaScope<instantiateAliases<aliases>> => new SchemaScope(aliases, config)

export class SchemaScope<
	$ extends InternalResolutions = InternalResolutions
> extends BaseScope<$> {
	parseRoot(def: unknown, opts: NodeParseOptions = {}): BaseRoot {
		const node = this.schema(
			def as never,
			this.finalizeRootArgs(opts, () => node)
		)
		return node
	}
}

export const root: SchemaScope = new SchemaScope({})

export const schema: SchemaScope["schema"] = root.schema
export const node: SchemaScope["node"] = root.node
export const defineRoot: SchemaScope["defineRoot"] = root.defineRoot
export const units: SchemaScope["units"] = root.units
export const generic: SchemaScope["generic"] = root.gerinec

export const parseAsSchema = (
	def: unknown,
	opts?: NodeParseOptions
): BaseRoot | ParseError => {
	try {
		return schema(def as RootSchema, opts) as never
	} catch (e) {
		if (e instanceof ParseError) return e
		throw e
	}
}

export class InternalRootModule<
	resolutions extends InternalResolutions = InternalResolutions
> extends DynamicBase<resolutions> {
	declare readonly [arkKind]: "module"
}

export type destructuredExportContext<$, names extends exportedNameOf<$>[]> = {
	[k in names extends [] ? exportedNameOf<$> : names[number]]: $[k]
}

export type destructuredImportContext<$, names extends exportedNameOf<$>[]> = {
	[k in names extends [] ? exportedNameOf<$> : names[number] as `#${k &
		string}`]: $[k]
}

export type RootExportCache = Record<
	string,
	BaseRoot | GenericRoot | InternalRootModule | undefined
>

const resolutionsOfModule = ($: BaseScope, typeSet: RootExportCache) => {
	const result: InternalResolutions = {}
	for (const k in typeSet) {
		const v = typeSet[k]
		if (hasArkKind(v, "module")) {
			const innerResolutions = resolutionsOfModule($, v as never)
			const prefixedResolutions = flatMorph(
				innerResolutions,
				(innerK, innerV) => [`${k}.${innerK}`, innerV]
			)
			Object.assign(result, prefixedResolutions)
		} else if (hasArkKind(v, "generic")) result[k] = v
		else if (hasArkKind(v, "root")) result[k] = v
		else throwInternalError(`Unexpected scope resolution ${printable(v)}`)
	}
	return result
}

export const writeUnresolvableMessage = <token extends string>(
	token: token
): writeUnresolvableMessage<token> => `'${token}' is unresolvable`

export type writeUnresolvableMessage<token extends string> =
	`'${token}' is unresolvable`

export const writeNonSubmoduleDotMessage = <name extends string>(
	name: name
): writeNonSubmoduleDotMessage<name> =>
	`'${name}' must reference a module to be accessed using dot syntax`

export type writeNonSubmoduleDotMessage<name extends string> =
	`'${name}' must reference a module to be accessed using dot syntax`

export const writeMissingSubmoduleAccessMessage = <name extends string>(
	name: name
): writeMissingSubmoduleAccessMessage<name> =>
	`Reference to submodule '${name}' must specify an alias`

export type writeMissingSubmoduleAccessMessage<name extends string> =
	`Reference to submodule '${name}' must specify an alias`

export const bindCompiledScope = (references: readonly BaseNode[]): void => {
	const compiledTraversals = compileScope(references)
	for (const node of references) {
		if (node.jit) {
			// if node has already been bound to another scope or anonymous type, don't rebind it
			continue
		}
		node.jit = true
		node.traverseAllows =
			compiledTraversals[`${node.id}Allows`].bind(compiledTraversals)
		if (node.isRoot() && !node.allowsRequiresContext) {
			// if the reference doesn't require context, we can assign over
			// it directly to avoid having to initialize it
			node.allows = node.traverseAllows as never
		}
		node.traverseApply =
			compiledTraversals[`${node.id}Apply`].bind(compiledTraversals)
	}
}

const compileScope = (references: readonly BaseNode[]) =>
	new CompiledFunction()
		.block("return", js => {
			references.forEach(node => {
				const allowsCompiler = new NodeCompiler("Allows").indent()
				node.compile(allowsCompiler)
				const applyCompiler = new NodeCompiler("Apply").indent()
				node.compile(applyCompiler)
				js.line(`${allowsCompiler.writeMethod(`${node.id}Allows`)},`).line(
					`${applyCompiler.writeMethod(`${node.id}Apply`)},`
				)
			})
			return js
		})
		.compile<
			() => {
				[k: `${string}Allows`]: TraverseAllows
				[k: `${string}Apply`]: TraverseApply
			}
		>()()
