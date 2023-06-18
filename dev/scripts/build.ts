import { cpSync, rmSync } from "node:fs"
import { join } from "node:path"
import { readJson, writeJson } from "../attest/src/fs.js"
import { shell } from "../attest/src/shell.js"
import { repoDirs } from "./common.js"
import { rewritePaths } from "./overwrite.js"

const packageRoot = process.cwd()
const outRoot = join(packageRoot, "dist")
const packageJson = readJson(join(packageRoot, "package.json"))

const nuke = (target: string) =>
    rmSync(target, { recursive: true, force: true })
const clone = (from: string, to: string): void =>
    cpSync(from, to, { recursive: true, force: true })

const writeManifest =
    (overrides: Record<string, unknown>) =>
        (sourceDir: string, targetDir: string) => {
            const manifest = readJson(join(sourceDir, "package.json"))
            writeJson(join(targetDir, "package.json"), {
                ...manifest,
                ...overrides
            })
        }

const Sources = {
    utils: ["dev", "utils"],
    attest: ["dev", "attest"]
} as const

const replacementDictionary = {
    attest: `@arktype/attest`,
    utils: `@arktype/utils`,
} as const

const ignorePaths = [
    "node_modules",
    "src/index",
    "package.json"
]

const fixBuildPaths
    : (buildPath: string) => void
    = rewritePaths(ignorePaths, replacementDictionary)

const buildFormat = (module: ModuleKind) => {
    const moduleKindDir = ModuleKindToDir[module]
    const outDir = join(outRoot, moduleKindDir)
    const outUtils = join(outDir, ...Sources.utils, "src")
    const outAttest = join(outDir, ...Sources.attest, "src")
    const outUtilsTarget = join(
        packageRoot,
        ...Sources.utils,
        "dist",
        moduleKindDir
    )
    const outAttestTarget = join(
        packageRoot,
        ...Sources.attest,
        "dist",
        moduleKindDir
    )

    const tempTsConfig = {
        ...baseTsConfig,
        include: ["src", Sources.utils.join("/"), Sources.attest.join("/")],
        compilerOptions: {
            ...compilerOptions,
            noEmit: false,
            module,
            outDir
        }
    }

    const writePackageManifest = writeManifest({
        type: ModuleKindToPackageType[module]
    })

    writeJson(tempTsConfigPath, tempTsConfig)

    try {
        shell(`pnpm tsc --project ${tempTsConfigPath}`)
        const outSrc = join(outDir, "src")
        const outDev = join(outDir, "dev")
        // not sure which setting to change to get it to compile here in the first place
        clone(outSrc, outDir)
        clone(outUtils, outUtilsTarget)
        clone(outAttest, outAttestTarget)

        writePackageManifest(repoDirs.root, outDir)
        writePackageManifest(repoDirs.attest, outAttestTarget)
        // writePackageManifest(repoDirs.utils, outUtilsTarget)

        fixBuildPaths(outDir)
        fixBuildPaths(outUtilsTarget)
        fixBuildPaths(outAttestTarget)

        nuke(outSrc)
        nuke(outDev)
        nuke(outUtils)
        nuke(outAttest)
    } finally {
        rmSync(tempTsConfigPath, { force: true })
    }
}

type ModuleKind = (typeof ModuleKind)[keyof typeof ModuleKind]
const ModuleKind = {
    CommonJS: "CommonJS",
    ESNext: "ESNext"
} as const
const ModuleKindToDir = {
    [ModuleKind.CommonJS]: "cjs",
    [ModuleKind.ESNext]: "mjs"
} as const

const ModuleKindToPackageType = {
    [ModuleKind.CommonJS]: "commonjs",
    [ModuleKind.ESNext]: "module"
} as const

console.log(`🔨 Building ${packageJson.name}...`)
rmSync(outRoot, { recursive: true, force: true })
const baseTsConfig = readJson(join(repoDirs.configs, "tsconfig.base.json"))
const { compilerOptions } = baseTsConfig
const tempTsConfigPath = join(packageRoot, "tsconfig.temp.json")
buildFormat(ModuleKind.ESNext)
buildFormat(ModuleKind.CommonJS)
console.log(`📦 Successfully built ${packageJson.name}!`)
