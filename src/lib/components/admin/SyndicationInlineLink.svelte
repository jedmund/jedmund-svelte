<script lang="ts">
	let {
		value = $bindable(''),
		oncommit,
		oncancel,
		placeholder = ''
	}: {
		value?: string
		oncommit: () => void
		oncancel: () => void
		placeholder?: string
	} = $props()
	function keydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault()
			oncommit()
		}
		if (event.key === 'Escape') {
			event.preventDefault()
			oncancel()
		}
	}
</script>

<div class="edit-inline">
	<input
		type="url"
		aria-label="Syndication link"
		bind:value
		class="edit-input"
		{placeholder}
		onkeydown={keydown}
		onblur={oncommit}
	/>
</div>

<style lang="scss">
	.edit-inline {
		display: flex;
		align-items: center;
		gap: $unit;
	}

	.edit-input {
		font-size: $font-size-small;
		padding: 2px $unit;
		border: 1px solid $gray-80;
		border-radius: 4px;
		width: 200px;
		color: $gray-20;

		&:focus {
			outline: none;
			border-color: $blue-50;
		}
	}
</style>
