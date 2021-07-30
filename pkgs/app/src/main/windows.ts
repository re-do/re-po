import {
    BrowserWindow,
    BrowserWindowConstructorOptions,
    nativeImage
} from "electron"
import icon from "assets/icon.png"
import { store } from "./store"
import { writeFileSync } from "fs"
import { join } from "path"

export let mainWindow: BrowserWindow
export let builderWindow: BrowserWindow

const BASE_URL =
    process.env["NODE_ENV"] === "development"
        ? `http://localhost:${process.env["VITE_DEV_SERVER_PORT"]}`
        : `file://${__dirname}/../renderer/index.html`

const defaultElectronOptions: BrowserWindowConstructorOptions = {
    webPreferences: {
        // This file is generated by vite after the main bundle as dist/main/preload.js
        preload: join(__dirname, "preload.js")
    },
    icon: nativeImage.createFromDataURL(icon),
    autoHideMenuBar: true,
    show: false
}

export const createMainWindow = async () => {
    mainWindow = new BrowserWindow({
        ...defaultElectronOptions,
        title: "Redo"
    })
    await mainWindow.loadURL(BASE_URL)
    mainWindow.maximize()
    mainWindow.show()
}

export const createBuilderWindow = async () => {
    builderWindow = new BrowserWindow({
        ...defaultElectronOptions,
        title: "New Test"
    })
    // Builder window should always exist, even if it's not shown
    builderWindow.on("close", () => {
        store.$.closeBuilder()
        createBuilderWindow()
    })
    await builderWindow.loadURL(`${BASE_URL}#builder`)
}
