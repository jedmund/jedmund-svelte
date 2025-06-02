<script lang="ts">
	interface Props {
		class?: string
	}

	let { class: className = '', children }: Props = $props()
</script>

<div class="dropdown-menu {className}">
	{@render children()}
</div>

<style lang="scss">
	@import '$styles/variables.scss';

	.dropdown-menu {
		position: absolute;
		top: calc(100% + $unit-half);
		right: 0;
		background: white;
		border: 1px solid $grey-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		min-width: 180px;
		z-index: 10;
	}
</style>