import { domainOf } from "./domain.js"
import { throwInternalError } from "./errors.js"
import type { show } from "./generics.js"
import { objectKindOf } from "./objectKinds.js"
import type { intersectOverloadReturns } from "./unionToTuple.js"

// Eventually we can just import from package.json in the source itself
// but for now, import assertions are too unstable and it wouldn't support
// recent node versions (https://nodejs.org/api/esm.html#json-modules).

// For now, we assert this matches the package.json version via a unit test.
export const arkUtilVersion = "0.2.0"

export const initialRegistryContents = {
	version: arkUtilVersion,
	filename: import.meta.filename
}

export type InitialRegistryContents = typeof initialRegistryContents

export const $ark: ArkEnv.registry = initialRegistryContents as never

declare global {
	export interface ArkEnv {
		registry(): {}
		prototypes(): never
	}

	export namespace ArkEnv {
		export type registry = show<
			InitialRegistryContents & intersectOverloadReturns<ArkEnv["registry"]>
		>

		export type prototypes = ReturnType<ArkEnv["prototypes"]>
	}
}

const namesByResolution = new WeakMap<object | symbol, string>()
const nameCounts: Record<string, number | undefined> = {}

export const register = (value: object | symbol): string => {
	const existingName = namesByResolution.get(value)
	if (existingName) return existingName

	let name = baseNameFor(value)
	if (nameCounts[name]) name = `${name}${nameCounts[name]!++}`
	else nameCounts[name] = 1
	;($ark as any)[name] = value
	namesByResolution.set(value, name)
	return name
}

export const isDotAccessible = (keyName: string): boolean =>
	/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(keyName)

const baseNameFor = (value: object | symbol) => {
	switch (typeof value) {
		case "object": {
			if (value === null) break

			const prefix = objectKindOf(value) ?? "object"
			// convert to camelCase
			return prefix[0].toLowerCase() + prefix.slice(1)
		}
		case "function":
			return isDotAccessible(value.name) ? value.name : "fn"
		case "symbol":
			return value.description && isDotAccessible(value.description) ?
					value.description
				:	"symbol"
	}
	return throwInternalError(
		`Unexpected attempt to register serializable value of type ${domainOf(
			value
		)}`
	)
}
