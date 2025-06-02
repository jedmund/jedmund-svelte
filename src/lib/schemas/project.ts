import { z } from 'zod'

export const projectSchema = z
	.object({
		title: z.string().min(1, 'Title is required'),
		description: z.string().optional(),
		year: z
			.number()
			.min(1990)
			.max(new Date().getFullYear() + 1),
		client: z.string().optional(),
		externalUrl: z.string().url().optional().or(z.literal('')),
		backgroundColor: z
			.string()
			.regex(/^#[0-9A-Fa-f]{6}$/)
			.optional()
			.or(z.literal('')),
		highlightColor: z
			.string()
			.regex(/^#[0-9A-Fa-f]{6}$/)
			.optional()
			.or(z.literal('')),
		status: z.enum(['draft', 'published', 'list-only', 'password-protected']),
		password: z.string().optional()
	})
	.refine(
		(data) => {
			if (data.status === 'password-protected') {
				return data.password && data.password.trim().length > 0
			}
			return true
		},
		{
			message: 'Password is required when status is password-protected',
			path: ['password']
		}
	)

export type ProjectSchema = z.infer<typeof projectSchema>
