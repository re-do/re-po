import { ListPossibleTypes } from "@re-/tools"
import { fromFileUrl } from "deno/std/path/mod.ts"
import { typeAssertions, TypeAssertions } from "src/type/index.ts"
import { valueAssertions, ValueAssertion } from "src/value/index.ts"
import getCurrentLine from "get-current-line"
import { getReAssertConfig, ReAssertConfig } from "src/common.ts"

export type AssertionResult<
    T,
    AllowTypeAssertions extends boolean
> = ValueAssertion<ListPossibleTypes<T>, AllowTypeAssertions> &
    (AllowTypeAssertions extends true ? TypeAssertions : {})

export type Assertion = <T>(value: T) => AssertionResult<T, true>

export type AssertionContext = {
    allowTypeAssertions: boolean
    returnsCount: number
    config: ReAssertConfig
}

export const assert: Assertion = (
    value: unknown,
    internalConfigHooks?: Partial<AssertionContext>
) => {
    const position = getCurrentLine({ method: "assert" })
    if (position.file.startsWith("file:///")) {
        position.file = fromFileUrl(position.file)
    }
    const config: AssertionContext = {
        allowTypeAssertions: true,
        returnsCount: 0,
        config: { ...getReAssertConfig(), ...internalConfigHooks }
    }
    const assertionContext = valueAssertions(position, value, config)
    if (config.allowTypeAssertions) {
        return Object.assign(typeAssertions(position, config), assertionContext)
    }
    return assertionContext as any
}
