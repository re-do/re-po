import type { array } from "./arrays.js"
import { domainOf, type Primitive } from "./domain.js"
import { serializePrimitive, type SerializablePrimitive } from "./primitive.js"
import type { dict, Dict } from "./records.js"
import { register } from "./registry.js"

export type SerializationOptions = {
	onCycle?: (value: object) => string
	onSymbol?: (value: symbol) => string
	onFunction?: (value: Function) => string
	onUndefined?: string
}

export type Json =
	| {
			[k: string | number]: JsonData
	  }
	| JsonData[]

export type JsonPrimitive = string | boolean | number | null

export type JsonData = Json | JsonPrimitive

export const snapshot = <t>(
	data: t,
	opts: SerializationOptions = { onUndefined: "(undefined)" }
): snapshot<t> => _serialize(data, opts, []) as never

export type snapshot<t, depth extends 1[] = []> =
	unknown extends t ? unknown
	: t extends Primitive ? snapshotPrimitive<t>
	: t extends Function ? `Function(${string})`
	: t extends Date ? string
	: depth["length"] extends 10 ? unknown
	: t extends array<infer item> ? array<snapshot<item, [...depth, 1]>>
	: {
			[k in keyof t]: snapshot<t[k], [...depth, 1]>
		}

type snapshotPrimitive<t> =
	t extends undefined ? "(undefined)"
	: t extends bigint ? `${t}n`
	: t extends symbol ? `(symbol${string})`
	: t

export const print = (data: unknown, indent?: number): void =>
	console.log(printable(data, indent))

export const printable = (data: unknown, indent?: number): string => {
	switch (domainOf(data)) {
		case "object":
			const o = data as dict
			const ctorName = o.constructor.name
			return (
				ctorName === "Object" || ctorName === "Array" ?
					JSON.stringify(_serialize(o, printableOpts, []), null, indent)
				: o instanceof Date ? describeCollapsibleDate(o)
				: typeof o.expression === "string" ? o.expression
				: ctorName
			)
		case "symbol":
			return printableOpts.onSymbol(data as symbol)
		default:
			return serializePrimitive(data as SerializablePrimitive)
	}
}

const printableOpts = {
	onCycle: () => "(cycle)",
	onSymbol: v => `Symbol(${register(v)})`,
	onFunction: v => `Function(${register(v)})`
} satisfies SerializationOptions

const _serialize = (
	data: unknown,
	opts: SerializationOptions,
	seen: unknown[]
): unknown => {
	switch (domainOf(data)) {
		case "object": {
			if (typeof data === "function") return printableOpts.onFunction(data)

			if (seen.includes(data)) return "(cycle)"

			const nextSeen = [...seen, data]
			if (Array.isArray(data))
				return data.map(item => _serialize(item, opts, nextSeen))

			if (data instanceof Date) return data.toDateString()

			const result: Record<string, unknown> = {}
			for (const k in data as Dict)
				result[k] = _serialize((data as any)[k], opts, nextSeen)

			return result
		}
		case "symbol":
			return printableOpts.onSymbol(data as symbol)
		case "bigint":
			return `${data}n`
		case "undefined":
			return opts.onUndefined ?? "undefined"
		default:
			return data
	}
}

/**
 * Converts a Date object to a string representation, stopping at the first zero component.
 *
 * @param {Date} date - The date to be converted to a string.
 * @returns {string} The string representation of the date.
 */
export const describeCollapsibleDate = (date: Date): string => {
	const year = date.getFullYear()
	const month = date.getMonth()
	const dayOfMonth = date.getDate()
	const hours = date.getHours()
	const minutes = date.getMinutes()
	const seconds = date.getSeconds()
	const milliseconds = date.getMilliseconds()

	if (
		month === 0 &&
		dayOfMonth === 1 &&
		hours === 0 &&
		minutes === 0 &&
		seconds === 0 &&
		milliseconds === 0
	)
		return `${year}`

	const datePortion = `${months[month]} ${dayOfMonth}, ${year}`

	if (hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0)
		return datePortion

	let timePortion = date.toLocaleTimeString()

	if (milliseconds) {
		const formattedMillis = `.${pad(milliseconds, 3)}`
		if (timePortion.endsWith(" AM") || timePortion.endsWith(" PM"))
			timePortion = `${timePortion.slice(0, -3)}${formattedMillis}${timePortion.slice(-3)}`
		else timePortion += formattedMillis
	}

	return `${timePortion}, ${datePortion}`
}

const months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
]

const pad = (value: number, length: number) =>
	String(value).padStart(length, "0")
