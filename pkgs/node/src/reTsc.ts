import { transform } from "@re-/tools"
import { existsSync, rmSync } from "fs"
import { join } from "path"
import { stdout } from "process"
import { findPackageRoot, walkPaths } from "./fs.js"
import { shell } from "./shell.js"
import { transpileTs, findPackageName, isTest } from "./ts.js"

const packageRoot = findPackageRoot(process.cwd())
const packageName = findPackageName(packageRoot)
const outRoot = join(packageRoot, "out")
const typesOut = join(outRoot, "types")
const esmOut = join(outRoot, "esm")
const cjsOut = join(outRoot, "cjs")
const successMessage = `🎁 Successfully built ${packageName}!`

export type BuildTypesOptions = {
    asBuild?: boolean
    noEmit?: boolean
}

export const checkTypes = () => buildTypes({ noEmit: true })

export const buildTypes = ({ noEmit, asBuild }: BuildTypesOptions = {}) => {
    stdout.write(
        `${noEmit ? "🧐 Checking" : "⏳ Building"} types...`.padEnd(
            successMessage.length
        )
    )
    let cmd = "npx tsc"
    if (asBuild) {
        cmd += " --build"
    } else {
        if (noEmit) {
            cmd += " --noEmit"
        } else {
            cmd += ` --declaration --emitDeclarationOnly --outDir ${typesOut}`
        }
    }
    shell(cmd, {
        cwd: packageRoot,
        stdio: "pipe",
        suppressCmdStringLogging: true
    })
    if (!noEmit) {
        if (!existsSync(typesOut)) {
            throw new Error(
                `Expected type output did not exist at '${typesOut}'.`
            )
        }
        walkPaths(typesOut)
            .filter((path) => isTest(path))
            .forEach((path) => rmSync(path, { recursive: true, force: true }))
    }
    stdout.write(`✅\n`)
}

export const buildEsm = async () => {
    transpileTs({
        packageRoot,
        toDir: esmOut,
        module: "esnext"
    })
}

export const buildCjs = async () => {
    transpileTs({
        packageRoot,
        toDir: cjsOut,
        module: "commonjs"
    })
}

type Transpiler = () => Promise<void>

const defaultTranspilers = {
    esm: buildEsm,
    cjs: buildCjs
}

export const transpile = async (
    transpilers: Transpiler[] = Object.values(defaultTranspilers)
) => {
    stdout.write(`⌛ Transpiling...`.padEnd(successMessage.length))
    await Promise.all(
        Object.values(transpilers).map((transpiler) => transpiler())
    )
    stdout.write("✅\n")
}

export type RedoTscOptions = {
    types?: BuildTypesOptions
    skip?: {
        cjs?: boolean
        esm?: boolean
        types?: boolean
    }
}

export const redoTsc = async (options?: RedoTscOptions) => {
    console.log(`🔨 Building ${packageName}...`)
    rmSync(outRoot, { recursive: true, force: true })
    if (!options?.skip?.types) {
        buildTypes(options?.types)
    }
    const transpilers = transform(
        defaultTranspilers,
        ([name, transpiler]) =>
            options?.skip?.[name] ? null : [name, transpiler],
        { asArray: "always" }
    )
    await transpile(transpilers)
    console.log(successMessage)
}

export const runRedoTsc = () =>
    redoTsc({
        types: {
            asBuild: process.argv.includes("--asBuild"),
            noEmit: process.argv.includes("--noEmitTypes")
        },
        skip: {
            esm: process.argv.includes("--skipEsm"),
            cjs: process.argv.includes("--skipCjs"),
            types: process.argv.includes("--skipTypes")
        }
    })
