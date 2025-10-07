import { fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { adminFetch, adminFetchJson } from '$lib/server/admin/authenticated-fetch'
import type { AdminProject } from '$lib/types/admin'

interface ProjectsResponse {
	projects: AdminProject[]
}

function toStatusCounts(projects: AdminProject[]) {
	return projects.reduce(
		(counts, project) => {
			counts.all += 1
			counts[project.status as 'draft' | 'published'] += 1
			return counts
		},
		{ all: 0, published: 0, draft: 0 }
	)
}

function toTypeCounts(projects: AdminProject[]) {
	return projects.reduce(
		(counts, project) => {
			counts.all += 1
			if (project.projectType === 'work') counts.work += 1
			if (project.projectType === 'labs') counts.labs += 1
			return counts
		},
		{ all: 0, work: 0, labs: 0 }
	)
}

export const load = (async (event) => {
	event.depends('admin:projects')

	const { projects } = await adminFetchJson<ProjectsResponse>(event, '/api/projects')

	return {
		items: projects,
		filters: {
			statusCounts: toStatusCounts(projects),
			typeCounts: toTypeCounts(projects)
		}
	}
}) satisfies PageServerLoad

export const actions = {
	toggleStatus: async (event) => {
		const formData = await event.request.formData()
		const id = Number(formData.get('id'))
		const status = formData.get('status')
		const updatedAt = formData.get('updatedAt')

		if (!Number.isFinite(id) || typeof status !== 'string' || typeof updatedAt !== 'string') {
			return fail(400, { message: 'Invalid toggle request' })
		}

		await adminFetch(event, `/api/projects/${id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				status,
				updatedAt
			})
		})

		return { success: true }
	},
	delete: async (event) => {
		const formData = await event.request.formData()
		const id = Number(formData.get('id'))

		if (!Number.isFinite(id)) {
			return fail(400, { message: 'Invalid project id' })
		}

		await adminFetch(event, `/api/projects/${id}`, {
			method: 'DELETE'
		})

		return { success: true }
	}
} satisfies Actions
