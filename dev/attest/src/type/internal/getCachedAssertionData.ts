import { existsSync } from "node:fs"
import { readJson } from "../../../../runtime/exports.js"
import type { AttestConfig } from "../../common.js"

export const getCachedAssertionData = (config: AttestConfig) => {
    if (!existsSync(config.assertionCacheFile)) {
        throw new Error(
            `Unable to find precached assertion data at '${config.assertionCacheFile}'. ` +
                `Did you forget to call 'cacheTypeAssertions' before running your tests?`
        )
    }
    return readJson(config.assertionCacheFile)
}
