<script lang="ts">
	import Button from '../Button.svelte'
	let {
		inline = false,
		characterCount,
		canSave,
		onupload,
		onbrowse,
		onsave
	}: {
		inline?: boolean
		characterCount: number
		canSave: boolean
		onupload: () => void
		onbrowse: () => void
		onsave: () => void
	} = $props()
	const CHARACTER_LIMIT = 600
	const isOverLimit = $derived(characterCount > CHARACTER_LIMIT)
</script>

<div class="composer-footer" class:inline>
	<div class="footer-left">
		<Button
			variant="ghost"
			iconOnly
			buttonSize="icon"
			onclick={onupload}
			title="Add image"
			class="tool-button"
		>
			{#snippet icon()}<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
					<rect
						x="2"
						y="2"
						width="14"
						height="14"
						rx="2"
						stroke="currentColor"
						stroke-width="1.5"
					/>
					<circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" />
					<path
						d="M2 12l4-4 3 3 5-5 2 2"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>{/snippet}
		</Button>

		<Button
			variant="ghost"
			iconOnly
			buttonSize="icon"
			onclick={onbrowse}
			title="Browse library"
			class="tool-button"
		>
			{#snippet icon()}<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
					<path
						d="M2 5L9 12L16 5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>{/snippet}
		</Button>
	</div>

	<div class="footer-right">
		<span
			class="character-count"
			class:warning={characterCount > CHARACTER_LIMIT * 0.9}
			class:error={isOverLimit}
		>
			{CHARACTER_LIMIT - characterCount}
		</span>
		{#if inline}<Button variant="primary" onclick={onsave} disabled={!canSave}>Post</Button>{/if}
	</div>
</div>

<style lang="scss">
	.composer-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: calc($unit * 1.5) $unit-2x;
		border-top: 1px solid $gray-80;
		background-color: $gray-5;
	}

	.footer-left,
	.footer-right {
		display: flex;
		align-items: center;
		gap: $unit-half;
	}

	.character-count {
		font-size: $font-size-small;
		color: $gray-50;
		font-weight: 400;
		padding: 0 $unit;
		min-width: 30px;
		text-align: right;
		font-variant-numeric: tabular-nums;

		&.warning {
			color: $universe-color;
		}

		&.error {
			color: $red-50;
			font-weight: 500;
		}
	}

	.composer-footer.inline {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit-2x $unit-3x;
		border-top: none;
		background-color: transparent;
	}
</style>
