import { rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { repoDirs } from "../common.js"
import { ensureDir, shell, walkPaths } from "../runtime/src/api.js"
import type { DocGenMappedDirsConfig } from "./main.js"
import type { SnippetsByPath } from "./snippets/extractSnippets.js"

// eslint-disable-next-line max-lines-per-function
export const mapDir = (
    snippetsByPath: SnippetsByPath,
    options: DocGenMappedDirsConfig
) => {
    const fileContentsByRelativeDestination = options.sources.flatMap(
        (sourceDir) =>
            walkPaths(sourceDir, {
                ...options.sourceOptions,
                excludeDirs: true
            }).map((sourceFilePath) => {
                const sourceRelativePath = relative(sourceDir, sourceFilePath)
                const repoRelativePath = relative(repoDirs.root, sourceFilePath)
                if (!(repoRelativePath in snippetsByPath)) {
                    throw new Error(
                        `Expected to find ${repoRelativePath} in snippets.`
                    )
                }
                let transformedContents =
                    snippetsByPath[repoRelativePath].all.text
                if (options.transformContents) {
                    transformedContents =
                        options.transformContents(transformedContents)
                }
                let transformedOutputPath = sourceRelativePath
                if (options.transformOutputPaths) {
                    transformedOutputPath = options.transformOutputPaths(
                        transformedOutputPath
                    )
                }
                return [
                    transformedOutputPath,
                    transformedContents,
                    repoRelativePath
                ]
            })
    )
    for (const target of options.targets) {
        const sourceMapData: Record<string, string> = {}
        const sourceMapPath = join(target, ".sourceMap.json")
        rmSync(target, { recursive: true, force: true })
        rmSync(sourceMapPath, { recursive: true, force: true })
        for (const [
            path,
            contents,
            source
        ] of fileContentsByRelativeDestination) {
            sourceMapData[path] = source
            const resolvedPath = join(target, path)
            ensureDir(dirname(resolvedPath))
            writeFileSync(resolvedPath, contents)
        }
        if (!options.skipFormatting) {
            shell(`prettier --write ${target}`)
        }
        writeFileSync(sourceMapPath, JSON.stringify(sourceMapData, null, 4))
    }
}
