import { writeJson, fromHere } from "@re-/node"
import { transform } from "@re-/tools"

const generateSpaceJson = () => {
    const simpleSpaceSeed = {
        user: {
            name: "string",
            bestFriend: "string?",
            groups: "string[]"
        },
        group: {
            title: "string",
            members: "string[]"
        }
    }
    const cyclicSpaceSeed = {
        user: {
            name: "string",
            bestFriend: "user?",
            groups: "group[]"
        },
        group: {
            title: "string",
            members: "user[]"
        }
    }
    const defs = Object.entries(simpleSpaceSeed).reduce(
        (result, [name, seedDef]) => {
            const variants: Record<string, any> = { [name]: seedDef }
            const randomInRange = (min: number, max: number) =>
                Math.floor(Math.random() * (max - min + 1)) + min
            const defCopyCount = 500
            for (let i = 2; i <= defCopyCount; i++) {
                variants[`${name}${i}`] = transform(
                    seedDef as any,
                    ([k, def]) => {
                        if (typeof def === "string") {
                            for (const name in cyclicSpaceSeed) {
                                def = def.replaceAll(
                                    name,
                                    `${name}${randomInRange(2, defCopyCount)}`
                                )
                            }
                        }
                        return [`${k}${i}`, def]
                    }
                )
            }
            return { ...result, ...variants }
        },
        {} as Record<string, any>
    )
    writeJson(fromHere("generatedSpace.json"), defs)
}

generateSpaceJson()
