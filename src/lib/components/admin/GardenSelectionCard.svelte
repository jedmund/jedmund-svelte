<script lang="ts">
	interface Props {
		title: string
		creator: string | null
		year: string | null
		imageUrl: string | null
		onChange: () => void
	}

	let { title, creator, year, imageUrl, onChange }: Props = $props()

	const subtitle = $derived([creator, year].filter(Boolean).join(' \u00B7 ') || null)
</script>

<button type="button" class="selection-card" onclick={onChange}>
	{#if imageUrl}
		<img class="card-cover" src={imageUrl} alt="" />
	{/if}

	<div class="card-info">
		<span class="card-title">{title}</span>
		{#if subtitle}
			<span class="card-subtitle">{subtitle}</span>
		{/if}
	</div>

	<span class="card-change-label">Change</span>
</button>

<style lang="scss">
	.selection-card {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		width: 100%;
		background-color: $input-background-color;
		border: none;
		border-radius: $corner-radius-2xl;
		padding: $unit-2x;
		min-height: 48px;
		cursor: pointer;
		text-align: left;
		transition: background-color $transition-fast ease;

		&:hover {
			background-color: $input-background-color-hover;
		}
	}

	.card-cover {
		width: auto;
		height: 56px;
		max-width: 80px;
		border-radius: $unit-half;
		object-fit: cover;
		flex-shrink: 0;
		transition: box-shadow $transition-fast ease;
	}

	.selection-card:hover .card-cover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.card-info {
		display: flex;
		flex-direction: column;
		gap: $unit-fourth;
		min-width: 0;
		flex: 1;
	}

	.card-title {
		font-size: $font-size-med;
		font-weight: $font-weight-med;
		color: $gray-10;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-subtitle {
		font-size: $font-size-small;
		color: $gray-50;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-change-label {
		flex-shrink: 0;
		font-size: $font-size-small;
		font-weight: $font-weight-med;
		color: $gray-50;
		margin-right: $unit-2x;
		transition: color $transition-fast ease;
	}

	.selection-card:hover .card-change-label {
		color: $red-50;
	}
</style>
