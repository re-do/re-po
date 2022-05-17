import { cacheTypeAssertions } from "@re-/assert"

beforeAll(() => {
    /**
     * This will fully parse all of this package's types
     * in preparation for the imported tests. The amount of time
     * it takes to do so is a heuristic for the performance
     * of those types.
     */
    const startTime = Date.now()
    console.log("Analyzing types...")
    cacheTypeAssertions()
    console.log(
        `Finished analyzing types in ${
            (Date.now() - startTime) / 1000
        } seconds⏱️`
    )
})

import "./space.assert.js"
import "./declaration.assert.js"
import "./inheritableConfigs.assert.js"
import "./demo.assert.js"
import "./stress.assert.js"
import "./definitions/index.js"
