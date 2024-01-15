import type { Repository } from "@lix-js/client"
import { hash } from "@lix-js/client"

export async function maybeCreateFirstProjectId(args: {
	projectPath: string
	repo?: Repository
}): Promise<void> {
	// the migration assumes a repository
	if (args.repo === undefined) {
		return
	}
	try {
		await args.repo.nodeishFs.readFile(args.projectPath + "/project_id", {
			encoding: "utf-8",
		})
	} catch (error) {
		// @ts-ignore
		if (error.code === "ENOENT" && args.repo) {
			const projectId = await generateProjectId({ repo: args.repo, projectPath: args.projectPath })
			if (projectId) {
				await args.repo.nodeishFs.writeFile(args.projectPath + "/project_id", projectId)
			}
		}
	}
}

export async function generateProjectId(args: { repo?: Repository; projectPath: string }) {
	if (!args.repo || !args.projectPath) {
		return undefined
	}
	const firstCommitHash = await args.repo.getFirstCommitHash()
	const originHash = await args.repo.getOrigin({ safeHashOnly: true })

	if (firstCommitHash) {
		return hash(`${firstCommitHash + args.projectPath + originHash}`)
	}
	return undefined
}