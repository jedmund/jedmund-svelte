/**
 * Encode a user-supplied string into a base64url segment safe for use inside a
 * colon-separated Redis key. Prevents delimiter injection (e.g., a `search`
 * term containing `:` that would collide with a structurally different key).
 *
 * Returns '-' for empty/nullish input so positional structure is preserved.
 */
export function safeKey(input: string | null | undefined): string {
	if (!input) return '-'
	return Buffer.from(input, 'utf8').toString('base64url')
}
