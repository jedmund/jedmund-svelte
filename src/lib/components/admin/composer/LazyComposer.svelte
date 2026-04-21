<script lang="ts">
	import { onMount } from 'svelte'
	import type { Component } from 'svelte'
	import type { ComposerProps } from './types'

	let {
		data = $bindable({
			type: 'doc',
			content: [{ type: 'paragraph' }]
		}),
		...rest
	}: ComposerProps = $props()

	let Composer = $state<Component<ComposerProps> | null>(null)

	// Keep a reference to the mounted inner component so we can re-expose its
	// methods to callers using `bind:this` on this wrapper. Typed as any
	// because `bind:this` on a dynamic Component resolves to SvelteComponent,
	// which doesn't carry our exported method types.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let inner = $state<any>(null)

	onMount(async () => {
		const mod = await import('./ComposerCore.svelte')
		Composer = mod.default as Component<ComposerProps>
	})

	export function focus() {
		inner?.focus()
	}
	export function blur() {
		inner?.blur()
	}
	export function clear() {
		inner?.clear()
	}
	export function isEmpty() {
		return inner?.isEmpty() ?? true
	}
	export function getContent() {
		return inner?.getContent()
	}
	export function getText() {
		return inner?.getText() ?? ''
	}
</script>

{#if Composer}
	<Composer bind:this={inner} bind:data {...rest} />
{:else}
	<div class="lazy-composer-placeholder" style:min-height="{rest.minHeight ?? 200}px">
		<div class="lazy-composer-skeleton"></div>
	</div>
{/if}

<style lang="scss">
	.lazy-composer-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		border-radius: $unit;
	}

	.lazy-composer-skeleton {
		width: 40px;
		height: 40px;
		border: 3px solid var(--card-border);
		border-top-color: var(--text-color);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
