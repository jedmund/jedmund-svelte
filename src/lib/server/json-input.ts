import { Prisma } from '@prisma/client'
import { z } from 'zod'

const jsonValue: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number().finite(),
		z.boolean(),
		z.null(),
		z.array(jsonValue),
		z.record(jsonValue)
	])
)

/** Omitted updates stay untouched; an explicit top-level null clears the SQL column. */
export function nullableJsonInput(
	value: unknown
): Prisma.InputJsonValue | Prisma.NullTypes.DbNull | undefined {
	if (value === undefined) return undefined
	const parsed = jsonValue.parse(value)
	return parsed === null ? Prisma.DbNull : parsed
}
