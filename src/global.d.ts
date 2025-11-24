declare module '*.svg' {
	const content: string
	export default content
}

declare module '*.svg?component' {
	import type { Component } from 'svelte'
	const content: Component
	export default content
}

declare module '*.svg?src' {
	const content: string
	export default content
}

declare module '*.svg?url' {
	const content: string
	export default content
}
