<!-- 
	This file is a shim for backward compatibility.
	The actual implementation is in ./composer/ComposerCore.svelte
-->
<script lang="ts">
	import ComposerCore from './composer/ComposerCore.svelte'
	import type { ComposerProps } from './composer/types'

	// Re-export all props
	let props: ComposerProps = $props()

	// Re-export component reference
	let composerRef = $state<ComposerCore>()

	// Re-export public methods
	export function focus() {
		composerRef?.focus()
	}

	export function blur() {
		composerRef?.blur()
	}

	export function clear() {
		composerRef?.clear()
	}

	export function isEmpty() {
		return composerRef?.isEmpty() || true
	}

	export function getContent() {
		return composerRef?.getContent()
	}

	export function getText() {
		return composerRef?.getText() || ''
	}
</script>

<ComposerCore bind:this={composerRef} {...props} />