"use strict"
;(self.webpackChunkarktype_io = self.webpackChunkarktype_io || []).push([
    [9184],
    {
        9613: (e, t, r) => {
            r.d(t, { Zo: () => u, kt: () => m })
            var n = r(9496)
            function o(e, t, r) {
                return (
                    t in e
                        ? Object.defineProperty(e, t, {
                              value: r,
                              enumerable: !0,
                              configurable: !0,
                              writable: !0
                          })
                        : (e[t] = r),
                    e
                )
            }
            function a(e, t) {
                var r = Object.keys(e)
                if (Object.getOwnPropertySymbols) {
                    var n = Object.getOwnPropertySymbols(e)
                    t &&
                        (n = n.filter(function (t) {
                            return Object.getOwnPropertyDescriptor(
                                e,
                                t
                            ).enumerable
                        })),
                        r.push.apply(r, n)
                }
                return r
            }
            function p(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {}
                    t % 2
                        ? a(Object(r), !0).forEach(function (t) {
                              o(e, t, r[t])
                          })
                        : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                              e,
                              Object.getOwnPropertyDescriptors(r)
                          )
                        : a(Object(r)).forEach(function (t) {
                              Object.defineProperty(
                                  e,
                                  t,
                                  Object.getOwnPropertyDescriptor(r, t)
                              )
                          })
                }
                return e
            }
            function c(e, t) {
                if (null == e) return {}
                var r,
                    n,
                    o = (function (e, t) {
                        if (null == e) return {}
                        var r,
                            n,
                            o = {},
                            a = Object.keys(e)
                        for (n = 0; n < a.length; n++)
                            (r = a[n]), t.indexOf(r) >= 0 || (o[r] = e[r])
                        return o
                    })(e, t)
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e)
                    for (n = 0; n < a.length; n++)
                        (r = a[n]),
                            t.indexOf(r) >= 0 ||
                                (Object.prototype.propertyIsEnumerable.call(
                                    e,
                                    r
                                ) &&
                                    (o[r] = e[r]))
                }
                return o
            }
            var i = n.createContext({}),
                l = function (e) {
                    var t = n.useContext(i),
                        r = t
                    return (
                        e &&
                            (r =
                                "function" == typeof e ? e(t) : p(p({}, t), e)),
                        r
                    )
                },
                u = function (e) {
                    var t = l(e.components)
                    return n.createElement(i.Provider, { value: t }, e.children)
                },
                s = {
                    inlineCode: "code",
                    wrapper: function (e) {
                        var t = e.children
                        return n.createElement(n.Fragment, {}, t)
                    }
                },
                f = n.forwardRef(function (e, t) {
                    var r = e.components,
                        o = e.mdxType,
                        a = e.originalType,
                        i = e.parentName,
                        u = c(e, [
                            "components",
                            "mdxType",
                            "originalType",
                            "parentName"
                        ]),
                        f = l(r),
                        m = o,
                        y = f["".concat(i, ".").concat(m)] || f[m] || s[m] || a
                    return r
                        ? n.createElement(
                              y,
                              p(p({ ref: t }, u), {}, { components: r })
                          )
                        : n.createElement(y, p({ ref: t }, u))
                })
            function m(e, t) {
                var r = arguments,
                    o = t && t.mdxType
                if ("string" == typeof e || o) {
                    var a = r.length,
                        p = new Array(a)
                    p[0] = f
                    var c = {}
                    for (var i in t) hasOwnProperty.call(t, i) && (c[i] = t[i])
                    ;(c.originalType = e),
                        (c.mdxType = "string" == typeof e ? e : o),
                        (p[1] = c)
                    for (var l = 2; l < a; l++) p[l] = r[l]
                    return n.createElement.apply(null, p)
                }
                return n.createElement.apply(null, r)
            }
            f.displayName = "MDXCreateElement"
        },
        8311: (e, t, r) => {
            r.r(t),
                r.d(t, {
                    assets: () => u,
                    contentTitle: () => i,
                    default: () => m,
                    frontMatter: () => c,
                    metadata: () => l,
                    toc: () => s
                })
            var n = r(4250),
                o = r(7075),
                a = (r(9496), r(9613)),
                p = ["components"],
                c = { hide_table_of_contents: !0 },
                i = "morph",
                l = {
                    unversionedId: "api/morph",
                    id: "api/morph",
                    title: "morph",
                    description: "text",
                    source: "@site/docs/api/morph.md",
                    sourceDirName: "api",
                    slug: "/api/morph",
                    permalink: "/docs/next/api/morph",
                    draft: !1,
                    tags: [],
                    version: "current",
                    frontMatter: { hide_table_of_contents: !0 }
                },
                u = {},
                s = [{ value: "text", id: "text", level: 2 }],
                f = { toc: s }
            function m(e) {
                var t = e.components,
                    r = (0, o.Z)(e, p)
                return (0, a.kt)(
                    "wrapper",
                    (0, n.Z)({}, f, r, { components: t, mdxType: "MDXLayout" }),
                    (0, a.kt)("h1", { id: "morph" }, "morph"),
                    (0, a.kt)("h2", { id: "text" }, "text"),
                    (0, a.kt)(
                        "pre",
                        null,
                        (0, a.kt)(
                            "code",
                            { parentName: "pre", className: "language-ts" },
                            'morph: Ark["morph"]\n'
                        )
                    )
                )
            }
            m.isMDXComponent = !0
        }
    }
])
