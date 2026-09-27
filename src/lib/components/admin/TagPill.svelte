<script lang="ts">
	import type { TagSuggestion } from '$lib/admin/tag-requests'
	let {
		tag,
		disabled,
		onremove
	}: { tag: TagSuggestion; disabled: boolean; onremove: (tag: TagSuggestion) => void } = $props()
</script>

<span class="tag-pill">
	{tag.displayName}
	<button
		type="button"
		onclick={(e) => {
			e.stopPropagation()
			onremove(tag)
		}}
		aria-label="Remove {tag.displayName}"
		{disabled}
	>
		×
	</button>
</span>

<style lang="scss">
	.tag-pill {
		display: inline-flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit $unit-2x;
		background: $accent-color;
		border-radius: $corner-radius-lg;
		font-size: 14px;
		color: $white;
		transition: background-color $transition-fast ease;

		&:hover {
			background: $red-50;
		}

		button {
			border: none;
			background: none;
			color: rgba(255, 255, 255, 0.7);
			cursor: pointer;
			font-size: 18px;
			line-height: 1;
			padding: $unit;
			margin: (-$unit) (-$unit) (-$unit) (-$unit-half);
			width: 16px;
			height: 16px;
			box-sizing: content-box;
			display: flex;
			align-items: center;
			justify-content: center;

			&:hover {
				color: $white;
			}

			&:disabled {
				cursor: not-allowed;
				opacity: 0.5;
			}
		}
	}
</style>
