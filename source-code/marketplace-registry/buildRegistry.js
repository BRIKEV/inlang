import fs from "node:fs/promises"
import { MarketplaceManifest } from "@inlang/marketplace-manifest"
import { Value } from "@sinclair/typebox/value"

const manifestLinks = JSON.parse(await fs.readFile("./registry.json", "utf-8"))

/** @type {import("@inlang/marketplace-manifest").MarketplaceManifest[]} */
const manifests = []

for (const link of manifestLinks) {
	const json = JSON.parse(await (await fetch(link)).text())
	if (Value.Check(MarketplaceManifest, json) === false) {
		const errors = [...Value.Errors(MarketplaceManifest, json)]
		console.log(errors)
		throw new Error(`Manifest '${link}' is invalid.`)
	}
	manifests.push(json)
}

// sort the manifests by id
manifests.sort((a, b) => {
	if (a.id.toUpperCase() < b.id.toUpperCase()) return -1
	if (a.id.toUpperCase() > b.id.toUpperCase()) return 1
	return 0
})

await fs.writeFile(
	"./src/registry.ts",
	`
	//! Do not edit this file manually. It is automatically generated based on the contents of the registry.json file.
	
	import type { MarketplaceManifest } from "@inlang/marketplace-manifest"
	export const registry: MarketplaceManifest[] = ${JSON.stringify(manifests, undefined, "\t")}`,
)
