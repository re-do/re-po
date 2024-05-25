// @ts-check

import react from "@astrojs/react"
import starlight from "@astrojs/starlight"
import { transformerTwoslash } from "@shikijs/twoslash"
import arkdarkColors from "arkdark/color-theme.json"
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json"
import { defineConfig } from "astro/config"

// https://astro.build/config
export default defineConfig({
	site: "https://arktype.io",
	redirects: {
		"/discord": "https://discord.gg/xEzdc3fJQC"
	},
	// cannot configure out dir to out to match other packges since dist is hard
	// coded into: https://github.com/withastro/action/blob/main/action.yml
	integrations: [
		starlight({
			title: "ArkType",
			logo: {
				src: "./src/assets/logo.svg",
				replacesTitle: true
			},
			social: {
				twitch: "https://twitch.tv/arktypeio",
				twitter: "https://twitter.com/arktypeio",
				discord: "https://arktype.io/discord",
				github: "https://github.com/arktypeio/arktype"
			},
			sidebar: [
				{
					label: "Intro",
					items: [{ label: "Why ArkType?", link: "/intro/why/" }]
				},
				{
					label: "Reference",
					items: [
						{ label: "Your first type", link: "/reference/your-first-type/" },
						{ label: "Scopes", link: "/reference/scopes/" },
						{ label: "Cheat sheet", link: "/reference/cheat-sheet/" }
					]
				}
			],
			customCss: ["@shikijs/twoslash/style-rich.css", "./src/styles.css"],
			expressiveCode: false
		}),
		react()
	],
	markdown: {
		shikiConfig: {
			theme: (() => {
				arkdarkColors.colors["editor.background"] = "#00000027"
				// @ts-expect-error
				arkdarkColors.tokenColors.push({
					// this is covered by editorBracketHighlight.foreground1 etc. in VSCode,
					// but it's not available in Shiki so add a replacement
					scope: ["meta.brace"],
					settings: {
						foreground: "#f5cf8f"
					}
				})
				return arkdarkColors
			})(),
			// @ts-expect-error
			langs: [arktypeTextmate],
			transformers: [transformerTwoslash()]
		}
	}
})
