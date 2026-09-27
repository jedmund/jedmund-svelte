import { z } from 'zod'
import type { Album } from '@prisma/client'
import type { JSONContent } from '@tiptap/core'

export const albumFormSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	slug: z
		.string()
		.min(1, 'Slug is required')
		.regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
	location: z.string().optional(),
	year: z.string().optional()
})

export function albumFormFields(album: Album | null) {
	return {
		title: album?.title || '',
		slug: album?.slug || '',
		year: album?.date ? new Date(album.date).getFullYear().toString() : '',
		location: album?.location || '',
		showInUniverse: album?.showInUniverse || false,
		status: (album?.status as 'draft' | 'published') || 'draft',
		content: (album?.content as JSONContent) || { type: 'doc', content: [{ type: 'paragraph' }] }
	}
}

export function albumPayload(fields: ReturnType<typeof albumFormFields>, updatedAt?: Date) {
	return {
		title: fields.title,
		slug: fields.slug,
		description: null,
		date: fields.year || null,
		location: fields.location || null,
		showInUniverse: fields.showInUniverse,
		status: fields.status,
		content: fields.content,
		updatedAt
	}
}
