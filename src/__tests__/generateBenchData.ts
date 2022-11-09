import { writeFileSync } from "node:fs"
import { fromHere } from "@arktype/runtime"

const randomInRange = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min

const cyclicScopeSeed = Object.freeze({
    user: {
        name: "string",
        "friends?": "user[]",
        groups: "group[]"
    },
    group: {
        title: "string",
        members: "user[]",
        isActive: "boolean|undefined"
    }
})

const generateScopeJson = (interval: number, seedDefs: object) => {
    const defs = Object.entries(seedDefs).reduce((result, [name, seedDef]) => {
        const variants: Record<string, any> = { [name]: seedDef }
        const defCopyCount = Math.floor(interval / 2)
        for (let i = 2; i <= defCopyCount; i++) {
            variants[`${i}${name}`] = Object.fromEntries(
                Object.entries(seedDef).map(([k, def]) => {
                    let randomizedDef = def as string
                    if (typeof def === "string") {
                        // Only randomize the cyclic scope values
                        for (let name in cyclicScopeSeed) {
                            if (name.endsWith("?")) {
                                name = name.slice(0, -1)
                            }
                            randomizedDef = randomizedDef.replaceAll(
                                name,
                                `${randomInRange(2, defCopyCount)}${name}`
                            )
                        }
                    }
                    return [`${i}${k}`, randomizedDef]
                })
            )
        }
        return { ...result, ...variants }
    }, {} as Record<string, any>)
    return JSON.stringify(defs, null, 4)
}

const seedMap = {
    cyclic: cyclicScopeSeed
}

type GenerateScopeBenchesOptions = {
    intervals: number[]
    seed: keyof typeof seedMap
}

const generateScopeBenches = ({
    intervals,
    seed
}: GenerateScopeBenchesOptions) => {
    const toFile = fromHere("generated", `${seed}.ts`)
    let benchDeclarations = ""
    for (const interval of intervals) {
        const scopeName = `${seed}${interval}`
        console.log(`Generating dictionary '${scopeName}'...`)
        benchDeclarations += `export const ${scopeName} = ${generateScopeJson(
            interval,
            seedMap[seed]
        )} as const

`
    }
    writeFileSync(toFile, benchDeclarations)
}

generateScopeBenches({
    intervals: [10, 100, 500],
    seed: "cyclic"
})
