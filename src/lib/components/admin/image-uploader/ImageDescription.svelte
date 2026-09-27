<script lang="ts">
	import Textarea from '../Textarea.svelte'
	interface Props {
		value: string
		compact: boolean
		saving: boolean
		error: string | null
		onSave: () => void
	}
	let { value = $bindable(), compact, saving, error, onSave }: Props = $props()
</script>

<div class="description" class:compact>
	<Textarea
		label="Description"
		bind:value
		placeholder="Describe this image for accessibility and SEO"
		helpText={compact
			? undefined
			: 'This description will be used for alt text and can also serve as a caption.'}
		rows={compact ? 2 : 3}
		size={compact ? 'small' : 'medium'}
		onblur={onSave}
	/>
	{#if error}
		<p class="save-error" role="alert">{error}. Your text is retained; leave the field to retry.</p>
	{:else if saving}
		<p class="save-status" role="status">Saving description...</p>
	{/if}
</div>

<style lang="scss">
	.description {
		display: flex;
		flex-direction: column;
		gap: $unit;
		padding: $unit-3x;
		background-color: $gray-97;
		border-radius: $card-corner-radius;
		border: 1px solid $gray-90;
		&.compact {
			padding: 0;
			border: 0;
			background: transparent;
		}
	}
	.save-status,
	.save-error {
		margin: 0;
		font-size: 0.75rem;
		color: $gray-40;
	}
	.save-error {
		color: $red-60;
	}
</style>
