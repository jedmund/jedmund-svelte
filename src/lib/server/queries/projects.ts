import type { Prisma, Project } from '@prisma/client'
import { prisma } from '$lib/server/database'

const PROJECT_ORDER = [
	{ displayOrder: 'asc' as const },
	{ year: 'desc' as const },
	{ createdAt: 'desc' as const }
]

export interface ProjectListParams {
	isAdmin: boolean
	projectType?: string
	status?: string
	includeListOnly?: boolean
	includePasswordProtected?: boolean
	page?: number
	limit?: number
}

export async function getProjects(params: ProjectListParams) {
	const {
		isAdmin,
		projectType,
		status,
		includeListOnly = false,
		includePasswordProtected = false,
		page = 1,
		limit = 20
	} = params

	const where: Prisma.ProjectWhereInput = {}

	if (status) {
		where.status = status
	} else if (!isAdmin) {
		const allowed = ['published']
		if (includeListOnly) allowed.push('list-only')
		if (includePasswordProtected) allowed.push('password-protected')
		where.status = { in: allowed }
	}

	if (projectType) where.projectType = projectType

	const skip = (page - 1) * limit
	const [projects, total] = await Promise.all([
		prisma.project.findMany({ where, orderBy: PROJECT_ORDER, skip, take: limit }),
		prisma.project.count({ where })
	])

	return { projects, total, page, limit }
}

export async function getProjectBySlug(slug: string) {
	return prisma.project.findUnique({ where: { slug } })
}

// Removes password, marks hasPassword/locked, and redacts gated fields when
// the viewer hasn't unlocked a password-protected project.
export function sanitizeProjectForViewer<T extends Project>(
	project: T,
	{ unlockedIds }: { unlockedIds: number[] }
) {
	const { password, ...rest } = project
	if (rest.status === 'password-protected') {
		const locked = !unlockedIds.includes(rest.id)
		if (locked) {
			return {
				...rest,
				caseStudyContent: null,
				gallery: [] as Prisma.JsonValue,
				hasPassword: true,
				locked: true
			}
		}
		return { ...rest, hasPassword: true, locked: false }
	}
	return { ...rest, hasPassword: !!password, locked: false }
}

export function sanitizeProjectList<T extends Project>(
	projects: T[],
	{ unlockedIds }: { unlockedIds: number[] }
) {
	return projects.map((p) => sanitizeProjectForViewer(p, { unlockedIds }))
}
