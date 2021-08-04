import {
    ChildProcess,
    shellAsync,
    fromHere,
    getRedoExecutablePath,
    killTree
} from "@re-do/node-utils"
import { until } from "@re-do/utils"
import { join } from "path"
import { existsSync, rmSync } from "fs"
import { version, install } from "../install"

const REDO_DIR = fromHere(".redo")
const VERSION_DIR = join(REDO_DIR, version)
const EXECUTABLE_PATH = getRedoExecutablePath(VERSION_DIR)

let redoMainProcess: ChildProcess | undefined

const deleteTestDir = () => rmSync(REDO_DIR, { recursive: true, force: true })

describe("installation", () => {
    beforeEach(() => {
        deleteTestDir()
    })
    afterEach(async () => {
        if (redoMainProcess && !redoMainProcess.killed) {
            await killTree(redoMainProcess.pid)
        }
        deleteTestDir()
    })
    test("works", async () => {
        await install(VERSION_DIR)
        redoMainProcess = shellAsync(EXECUTABLE_PATH, {
            cwd: VERSION_DIR,
            stdio: "ignore"
        })
        await until(() => existsSync(join(VERSION_DIR, "redo.json")))
    }, 120000)
})
