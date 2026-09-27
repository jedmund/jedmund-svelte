<script lang="ts">
	import { onMount } from 'svelte'
	import TagInput from '$lib/components/admin/TagInput.svelte'
	import Typeahead from '$lib/components/admin/Typeahead.svelte'
	import SyndicationStatus from '$lib/components/admin/SyndicationStatus.svelte'
	import InlineComposerModal from '$lib/components/admin/InlineComposerModal.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import type { TagSuggestion } from '$lib/admin/tag-requests'
	let { flow = 'suggestions' }: { flow?: 'suggestions' | 'syndication' | 'composer' } = $props()
	let ready = $state(false)
	let rejectSave = $state(true)
	let tags = $state<TagSuggestion[]>([])
	let value = $state('')
	let saved = $state(0)
	const sampleTags = [
		{ id: 1, name: 'design', displayName: 'Design', slug: 'design', usageCount: 12 },
		{ id: 2, name: 'development', displayName: 'Development', slug: 'development', usageCount: 5 }
	]
	onMount(() => {
		const original = window.fetch
		window.fetch = async (input, options) => {
			const url = new URL(String(input), window.location.origin)
			if (url.pathname === '/api/tags/suggest')
				return Response.json({
					suggestions: sampleTags.filter((tag) =>
						tag.name.includes(url.searchParams.get('q') ?? '')
					)
				})
			if (url.pathname === '/api/tags' && options?.method === 'POST') {
				const { name } = JSON.parse(String(options.body))
				return Response.json({ tag: { id: 3, name, displayName: name, slug: name } })
			}
			if (url.pathname.startsWith('/api/syndication/')) {
				if (!options?.method || options.method === 'GET') return Response.json({ syndications: [] })
				if (rejectSave)
					return Response.json(
						{ error: { message: 'Synthetic save failure. Your link is retained.' } },
						{ status: 503 }
					)
				const body = JSON.parse(String(options.body))
				const record = {
					id: 1,
					platform: body.platform || 'bluesky',
					status: 'manual',
					externalUrl: body.externalUrl || 'https://example.com/post',
					errorMessage: null,
					createdAt: ''
				}
				return Response.json(
					url.pathname.endsWith('/trigger') ? { syndications: [record] } : record
				)
			}
			if (url.pathname === '/api/posts' && options?.method === 'POST')
				return Response.json({ id: 1 })
			return original(input, options)
		}
		ready = true
		return () => {
			window.fetch = original
		}
	})
</script>

<div class="demo">
	{#if ready}
		{#if flow === 'suggestions'}
			<TagInput label="Tags" bind:tags placeholder="Search design or development" />
			<Typeahead
				bind:value
				category="books"
				search={async (query) => [
					{
						id: query,
						name: `${query} result`,
						subtitle: 'Synthetic suggestion',
						image: null,
						creator: null,
						year: null,
						sourceId: query,
						metadata: null,
						summary: null
					}
				]}
			/>
			<p>Selected tags: {tags.map((tag) => tag.displayName).join(', ')}</p>
		{:else if flow === 'syndication'}
			<Button onclick={() => (rejectSave = !rejectSave)}
				>{rejectSave ? 'Allow retry' : 'Reject saves'}</Button
			>
			<SyndicationStatus contentType="post" contentId={1} contentStatus="published" />
		{:else}
			<InlineComposerModal initialMode="page" onsaved={() => saved++} />
			<p>Published: {saved}</p>
		{/if}
	{/if}
</div>

<style lang="scss">
	.demo {
		max-width: 640px;
		padding: $unit-4x;
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
	}
</style>
