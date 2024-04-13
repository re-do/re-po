#!/usr/bin/env node
import { fileName } from "@arktype/fs"
import { basename } from "path"
import { precache } from "./precache.js"
import { stats } from "./stats.js"
import { trace } from "./trace.js"

const subcommands = {
	precache,
	trace,
	stats
}

type Subcommand = keyof typeof subcommands

const baseFileName = basename(fileName())

const thisFileIndex = process.argv.findIndex((s) => s.endsWith(baseFileName))

if (thisFileIndex === -1) {
	throw new Error(`Expected to find an argument ending with "${baseFileName}"`)
}

const subcommand = process.argv[thisFileIndex + 1]

if (!(subcommand in subcommands)) {
	console.error(
		`Expected a command like 'attest <subcommand>', where <subcommand> is one of:\n${Object.keys(
			subcommands
		)}`
	)
	process.exit(1)
}

const args = process.argv.slice(thisFileIndex + 2)

subcommands[subcommand as Subcommand](args)
