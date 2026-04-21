export const ERROR_CODES = {
	400: 'BAD_REQUEST',
	401: 'UNAUTHORIZED',
	403: 'FORBIDDEN',
	404: 'NOT_FOUND',
	409: 'CONFLICT',
	413: 'PAYLOAD_TOO_LARGE',
	422: 'UNPROCESSABLE_ENTITY',
	429: 'RATE_LIMITED',
	500: 'INTERNAL_ERROR',
	503: 'SERVICE_UNAVAILABLE'
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export function codeForStatus(status: number): ErrorCode {
	return ERROR_CODES[status as keyof typeof ERROR_CODES] ?? 'INTERNAL_ERROR'
}
