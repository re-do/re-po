import type { GenericParamAst, GenericParamDef } from "@arktype/schema"
import {
	type array,
	type keyError,
	throwParseError,
	type WhiteSpaceToken
} from "@arktype/util"
import { writeUnexpectedCharacterMessage } from "./string/shift/operator/operator.js"
import { Scanner } from "./string/shift/scanner.js"

export type GenericDeclaration<
	name extends string = string,
	params extends string = string
> = `${name}<${params}>`

// we put the error in a tuple so that parseGenericParams always returns a string[]
export type GenericParamsParseError<message extends string = string> = [
	keyError<message>
]

export const parseGenericParams = (def: string): array<GenericParamDef> =>
	_parseGenericParams(new Scanner(def))

export type parseGenericParams<def extends string> =
	_parseParams<def, "", []> extends (
		infer result extends array<GenericParamAst>
	) ?
		"" extends result[number][0] ?
			GenericParamsParseError<emptyGenericParameterMessage>
		:	result
	:	never

export const emptyGenericParameterMessage =
	"An empty string is not a valid generic parameter name"

export type emptyGenericParameterMessage = typeof emptyGenericParameterMessage

const _parseGenericParams = (scanner: Scanner): array<GenericParamDef> => {
	const param = scanner.shiftUntilNextTerminator()
	if (param === "") throwParseError(emptyGenericParameterMessage)

	scanner.shiftUntilNonWhitespace()
	const nextNonWhitespace = scanner.shift()
	return (
		nextNonWhitespace === "" ? [param]
		: nextNonWhitespace === "," ? [param, ..._parseGenericParams(scanner)]
		: throwParseError(writeUnexpectedCharacterMessage(nextNonWhitespace, ","))
	)
}

type _parseParams<
	unscanned extends string,
	param extends string,
	result extends array<GenericParamAst>
> =
	unscanned extends `${infer lookahead}${infer nextUnscanned}` ?
		lookahead extends "," ?
			_parseParams<nextUnscanned, "", [...result, [param, unknown]]>
		: lookahead extends WhiteSpaceToken ?
			param extends "" ?
				// if the next char is whitespace and we aren't in the middle of a param, skip to the next one
				_parseParams<Scanner.skipWhitespace<nextUnscanned>, "", result>
			: Scanner.skipWhitespace<nextUnscanned> extends (
				`${infer nextNonWhitespace}${infer rest}`
			) ?
				nextNonWhitespace extends "," ?
					_parseParams<rest, "", [...result, [param, unknown]]>
				:	GenericParamsParseError<
						writeUnexpectedCharacterMessage<nextNonWhitespace, ",">
					>
			:	// params end with a single whitespace character, add the current token
				[...result, [param, unknown]]
		:	_parseParams<nextUnscanned, `${param}${lookahead}`, result>
	: param extends "" ? result
	: [...result, [param, unknown]]
