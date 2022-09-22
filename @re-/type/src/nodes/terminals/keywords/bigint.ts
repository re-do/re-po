import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"

export class BigintNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "bigint") {
            args.diagnostics.add("keyword", args, {
                definition: "bigint",
                data: args.data,
                reason: "Must be a bigint"
            })
        }
    }

    generate(): bigint {
        return 0n
    }
}
