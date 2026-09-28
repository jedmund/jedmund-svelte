<script lang="ts">
	import type { Snippet } from 'svelte'
	import AdminSegmentedControl from '../AdminSegmentedControl.svelte'
	import Button from '../Button.svelte'
	import EssayMetadata from './EssayMetadata.svelte'
	let {
		essayTitle = $bindable(''),
		essaySlug = $bindable(''),
		essayExcerpt = $bindable(''),
		essayTags = $bindable(''),
		canSave,
		saving,
		onsave,
		oncancel,
		editor
	}: {
		essayTitle?: string
		essaySlug?: string
		essayExcerpt?: string
		essayTags?: string
		canSave: boolean
		saving: boolean
		onsave: () => void
		oncancel: () => void
		editor: Snippet
	} = $props()
	let essayTab = $state('metadata')
</script>

<div class="essay-composer">
	<div class="essay-header">
		<h1>New Essay</h1>
		<div class="essay-actions">
			<Button variant="secondary" onclick={oncancel}>Cancel</Button>
			<Button variant="primary" onclick={onsave} disabled={!canSave || saving}>Publish</Button>
		</div>
	</div>

	<AdminSegmentedControl
		options={[
			{ value: 'metadata', label: 'Metadata' },
			{ value: 'content', label: 'Content' }
		]}
		value={essayTab}
		onChange={(v) => (essayTab = v)}
	/>

	<div class="essay-content">
		{#if essayTab === 'metadata'}
			<EssayMetadata bind:essayTitle bind:essaySlug bind:essayExcerpt bind:essayTags />
		{:else}
			<div class="content-section">
				{@render editor()}
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	// Essay composer styles
	.essay-composer {
		max-width: 1200px;
		margin: 0 auto;
		padding: $unit-3x;
	}

	.essay-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: $unit-3x;

		h1 {
			font-size: 28px;
			font-weight: 600;
			margin: 0;
		}
	}

	.essay-actions {
		display: flex;
		gap: $unit;
	}

	.essay-content {
		margin-top: $unit-3x;
	}

	.content-section {
		:global(.editor) {
			min-height: 500px;
		}
	}
</style>
