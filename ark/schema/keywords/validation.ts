import { schema } from "../parser/parse.js"
import { space } from "../space.js"
import { creditCard } from "./utils/creditCard.js"
import type { spaceFromExports } from "./utils/utils.js"

// Non-trivial expressions should have an explanation or attribution

const url = schema({
	domain: "string",
	predicate: (s: string) => {
		try {
			new URL(s)
		} catch {
			return false
		}
		return true
	},
	description: "a valid URL"
})

// https://www.regular-expressions.info/email.html
const emailMatcher = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

const email = schema({
	domain: "string",
	regex: emailMatcher,
	description: "a valid email"
})

const uuidMatcher =
	/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
const uuid = schema({
	domain: "string",
	regex: uuidMatcher,
	description: "a valid UUID"
})

const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// https://semver.org/
const semver = schema({
	domain: "string",
	regex: semverMatcher,
	description: "a valid semantic version (see https://semver.org/)"
})

export namespace validation {
	export interface exports {
		alpha: string
		alphanumeric: string
		lowercase: string
		uppercase: string
		creditCard: string
		email: string
		uuid: string
		url: string
		semver: string
		integer: number
	}
}

export type validation = spaceFromExports<validation.exports>

export const validation: validation = space(
	{
		alpha: {
			domain: "string",
			regex: /^[A-Za-z]*$/,
			description: "only letters"
		},
		alphanumeric: {
			domain: "string",
			regex: /^[A-Za-z\d]*$/,
			description: "only letters and digits"
		},
		lowercase: {
			domain: "string",
			regex: /^[a-z]*$/,
			description: "only lowercase letters"
		},
		uppercase: {
			domain: "string",
			regex: /^[A-Za-z]*$/,
			description: "only uppercase letters"
		},
		creditCard,
		email,
		uuid,
		url,
		semver,
		integer: {
			domain: "number",
			divisor: 1,
			description: "an integer"
		}
	},
	{ prereducedAliases: true }
)
