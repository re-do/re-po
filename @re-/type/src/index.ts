export { type, dynamic } from "./type.js"
export type { Infer } from "./type.js"
export { space, def, dynamicSpace } from "./space.js"
export { declare } from "./declaration.js"
export { Root } from "./parser/root.js"
import type { Allows } from "./nodes/allows.js"
export type CustomValidator = Allows.CustomValidator
export type { ReferencesOf } from "./nodes/references.js"
