// The editor verifier loads UI modules without a SvelteKit application/router.
// Any actual navigation is unexpected in a schema-only verification run.
export function goto(): never {
	throw new Error('Navigation is unavailable during editor schema verification')
}
