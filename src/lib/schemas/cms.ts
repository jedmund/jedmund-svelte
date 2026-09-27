import { z } from 'zod'
import { jsonValueSchema } from './json'
import type { JsonValue } from '../editor/schema-contract'
import { GARDEN_CATEGORIES } from '../constants/garden'
import { projectSchema } from './project'
import { MAX_DATABASE_INT, schemaError } from '../api/validation'

// Validate the container and node structure without filtering custom node attributes.
const document = z
	.record(jsonValueSchema)
	.superRefine((value, context) => {
		const tiptap = value.type === 'doc'
		const children = tiptap ? value.content : (value.blocks ?? value.content)
		if (children === undefined && tiptap) return
		if (!Array.isArray(children)) {
			context.addIssue({ code: 'custom', message: 'Content must be an editor document' })
			return
		}
		function visit(node: JsonValue, path: (string | number)[]) {
			if (!tiptap && typeof node === 'string') return
			if (node === null || typeof node !== 'object' || Array.isArray(node)) {
				context.addIssue({ code: 'custom', path, message: 'Invalid content node' })
				return
			}
			if (tiptap && typeof node.type !== 'string')
				context.addIssue({ code: 'custom', path, message: 'Content nodes need a type' })
			if (node.text !== undefined && typeof node.text !== 'string')
				context.addIssue({
					code: 'custom',
					path: [...path, 'text'],
					message: 'Text must be a string'
				})
			if (
				node.attrs !== undefined &&
				(node.attrs === null || typeof node.attrs !== 'object' || Array.isArray(node.attrs))
			)
				context.addIssue({
					code: 'custom',
					path: [...path, 'attrs'],
					message: 'Attributes must be an object'
				})
			if (
				node.marks !== undefined &&
				(!Array.isArray(node.marks) ||
					node.marks.some((mark) => !object(mark) || typeof object(mark)?.type !== 'string'))
			)
				context.addIssue({
					code: 'custom',
					path: [...path, 'marks'],
					message: 'Invalid content marks'
				})
			if (Array.isArray(node.content))
				node.content.forEach((child, index) => visit(child, [...path, 'content', index]))
			else if (node.content !== undefined && (tiptap || typeof node.content !== 'string'))
				context.addIssue({
					code: 'custom',
					path: [...path, 'content'],
					message: 'Invalid node content'
				})
		}
		children.forEach((node, index) => visit(node, ['content', index]))
	})
	.nullable()
	.optional()
const text = (max?: number) =>
	(max === undefined ? z.string() : z.string().max(max)).nullable().optional()
const integer = z
	.number()
	.int()
	.min(-MAX_DATABASE_INT - 1)
	.max(MAX_DATABASE_INT)
export const idSchema = integer.positive()
const ids = z.array(idSchema)
const title = z.string().max(255)
const requiredTitle = title.refine((value) => value.trim().length > 0, 'Title is required')
const slug = z.string().max(255)
const publishedSlug = slug
	.min(1, 'Slug is required')
	.regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
const status = z.enum(['draft', 'published'])

function validCalendarDate(value: string): boolean {
	const prefix = value.slice(0, 10)
	const date = new Date(`${prefix}T00:00:00.000Z`)
	return (
		!prefix.startsWith('0000') &&
		Number.isFinite(date.getTime()) &&
		date.toISOString().slice(0, 10) === prefix
	)
}
const timestamp = z.string().datetime({ offset: true }).refine(validCalendarDate, 'Invalid date')
const date = z
	.union([
		z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.refine(validCalendarDate, 'Invalid date'),
		timestamp,
		z.literal('')
	])
	.nullable()
	.optional()
const albumDate = z
	.union([z.string().regex(/^(?!0000)\d{4}$/), date])
	.nullable()
	.optional()
const concurrency = { updatedAt: timestamp.nullable().optional() }

const postFields = z.object({
	title: text(255),
	slug: slug.optional(),
	type: z.enum(['post', 'essay']),
	status: status.optional(),
	content: document,
	excerpt: text(),
	syndicationText: text(240),
	featuredImage: text(500),
	attachedPhotos: ids.nullable().optional(),
	gallery: ids.optional(),
	tagIds: ids.optional(),
	syndicateBluesky: z.boolean().optional(),
	syndicateMastodon: z.boolean().optional(),
	appendLink: z.boolean().optional()
})
export const createPostSchema = postFields
export const updatePostSchema = postFields.partial().extend(concurrency)

const projectFields = z.object({
	title,
	subtitle: text(255),
	description: text(),
	year: integer,
	client: text(255),
	role: text(255),
	featuredImage: text(500),
	logoUrl: text(500),
	gallery: z.array(jsonValueSchema).nullable().optional(),
	externalUrl: text(500),
	caseStudyContent: document,
	backgroundColor: text(50),
	highlightColor: text(50),
	projectType: z.enum(['work', 'labs']).optional(),
	displayOrder: integer.optional(),
	status: z.enum(['draft', 'published', 'list-only', 'password-protected']).optional(),
	password: text(255),
	slug: slug.optional(),
	showFeaturedImageInHeader: z.boolean().optional(),
	showBackgroundColorInHeader: z.boolean().optional(),
	showLogoInHeader: z.boolean().optional()
})
export const createProjectSchema = projectFields.extend({
	title: requiredTitle,
	year: integer.refine((value) => value !== 0, 'Year is required')
})
export const updateProjectSchema = projectFields.partial().extend(concurrency)

const albumFields = z.object({
	title,
	slug,
	description: text(),
	date: albumDate,
	location: text(255),
	coverPhotoId: idSchema.nullable().optional(),
	status: status.optional(),
	showInUniverse: z.boolean().optional(),
	content: document
})
export const createAlbumSchema = albumFields.extend({
	title: requiredTitle,
	slug: slug.min(1, 'Slug is required')
})
export const updateAlbumSchema = albumFields.partial().extend(concurrency)
export const albumMediaSchema = z.object({ mediaIds: ids.min(1, 'Media IDs are required') })

const category = z
	.string()
	.refine((value) => GARDEN_CATEGORIES.some((item) => item.value === value), 'Invalid category')
const gardenFields = z.object({
	category,
	title,
	slug: slug.optional(),
	creator: text(255),
	imageUrl: text(500),
	url: text(500),
	sourceId: text(255),
	metadata: z.record(jsonValueSchema).nullable().optional(),
	summary: text(),
	date,
	note: document,
	rating: integer.min(1).max(5).nullable().optional(),
	isCurrent: z.boolean().optional(),
	isFavorite: z.boolean().optional(),
	showInUniverse: z.boolean().optional(),
	displayOrder: integer.optional(),
	status: status.optional()
})
export const createGardenSchema = gardenFields.extend({ title: requiredTitle })
export const updateGardenSchema = gardenFields.partial().extend(concurrency)

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>
export type CreateGardenInput = z.infer<typeof createGardenSchema>
export type UpdateGardenInput = z.infer<typeof updateGardenSchema>

function object(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined
}
function nonblank(value: unknown): boolean {
	return (
		typeof value === 'string' &&
		value
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;|&#160;/g, ' ')
			.trim().length > 0
	)
}

/** Checks content presence, not the editor schema; it never rewrites stored documents. */
export function hasPublishableContent(value: unknown): boolean {
	if (Array.isArray(value)) return value.some(hasPublishableContent)
	if (typeof value === 'string') return nonblank(value)
	const node = object(value)
	if (!node) return false
	if (typeof node.type === 'string' && /placeholder/i.test(node.type)) return false
	const attrs = object(node.attrs) ?? object(node.data) ?? node
	if (
		['image', 'audio', 'video', 'iframe'].includes(String(node.type)) &&
		nonblank(attrs.src ?? attrs.url)
	)
		return true
	if (node.type === 'urlEmbed' && nonblank(attrs.url)) return true
	if (
		node.type === 'gallery' &&
		Array.isArray(attrs.images) &&
		attrs.images.some((image) => {
			const item = object(image)
			return nonblank(typeof image === 'string' ? image : (item?.src ?? item?.url))
		})
	)
		return true
	if (
		node.type === 'geolocation' &&
		typeof attrs.latitude === 'number' &&
		typeof attrs.longitude === 'number' &&
		Number.isFinite(attrs.latitude) &&
		Number.isFinite(attrs.longitude)
	)
		return true
	if (['inlineMath', 'blockMath'].includes(String(node.type)) && nonblank(attrs.latex)) return true
	return (
		nonblank(node.text) ||
		hasPublishableContent(node.content) ||
		hasPublishableContent(node.blocks) ||
		nonblank(object(node.data)?.text)
	)
}

const publishPostSchema = z
	.object({
		postType: z.enum(['post', 'essay']),
		title: z.string().nullable().optional(),
		slug: publishedSlug,
		content: z.unknown(),
		attachments: z.unknown().optional()
	})
	.superRefine((post, context) => {
		if (post.postType === 'essay' && !post.title?.trim())
			context.addIssue({
				code: 'custom',
				path: ['title'],
				message: 'An essay needs a title before publishing'
			})
		if (
			!hasPublishableContent(post.content) &&
			!(Array.isArray(post.attachments) && post.attachments.length > 0)
		) {
			context.addIssue({
				code: 'custom',
				path: ['content'],
				message: 'Add content or media before publishing'
			})
		}
	})
const publishAlbumSchema = z.object({ title: requiredTitle, slug: publishedSlug })
const publishGardenSchema = publishAlbumSchema.extend({ category })
const publishProjectSchema = z
	.object({ slug: publishedSlug, projectType: z.enum(['work', 'labs']), title: requiredTitle })
	.and(projectSchema)

export function validatePublishing(
	kind: 'post' | 'project' | 'album' | 'garden',
	record: Record<string, unknown>
): Response | null {
	if (record.status === 'draft') return null
	const schemas = {
		post: publishPostSchema,
		project: publishProjectSchema,
		album: publishAlbumSchema,
		garden: publishGardenSchema
	}
	const candidate = { ...record }
	if (kind === 'project') {
		for (const key of [
			'description',
			'client',
			'externalUrl',
			'backgroundColor',
			'highlightColor',
			'password'
		]) {
			if (candidate[key] === null) candidate[key] = undefined
		}
	}
	const result = schemas[kind].safeParse(candidate)
	return result.success ? null : schemaError(result.error)
}
