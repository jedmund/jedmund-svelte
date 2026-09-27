import { z } from 'zod'

export function invalidInput(message: string, details?: unknown): Response {
	return Response.json(
		{ error: { code: 'BAD_REQUEST', message, ...(details === undefined ? {} : { details }) } },
		{ status: 400 }
	)
}

export function schemaError(error: z.ZodError): Response {
	return invalidInput('Validation failed', error.flatten())
}

export async function readValidatedBody<S extends z.ZodTypeAny>(
	request: Request,
	schema: S
): Promise<{ success: true; data: z.output<S> } | { success: false; response: Response }> {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return { success: false, response: invalidInput('Invalid JSON body') }
	}
	const result = schema.safeParse(body)
	return result.success
		? { success: true, data: result.data }
		: { success: false, response: schemaError(result.error) }
}

export const MAX_DATABASE_INT = 2_147_483_647

export function parseId(value: string): number | null {
	const id = Number(value)
	return /^\d+$/.test(value) && Number.isInteger(id) && id > 0 && id <= MAX_DATABASE_INT ? id : null
}
