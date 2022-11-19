import type { AttributeIntersector } from "./intersect.js"
import { intersect } from "./intersect.js"

export const intersectProps: AttributeIntersector<"props"> = (a, b) => {
    for (const k in b) {
        if (k in a) {
            a[k] = intersect(a[k], b[k])
        } else {
            a[k] = b[k]
        }
    }
    return a
}
