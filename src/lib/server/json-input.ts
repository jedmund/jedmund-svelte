import { Prisma } from '@prisma/client'
import { jsonValueSchema } from '../schemas/json'

/** Omitted updates stay untouched; an explicit top-level null clears the SQL column. */
export function nullableJsonInput(
	value: unknown
): Prisma.InputJsonValue | Prisma.NullTypes.DbNull | undefined {
	if (value === undefined) return undefined
	const parsed = jsonValueSchema.parse(value)
	return parsed === null ? Prisma.DbNull : parsed
}
