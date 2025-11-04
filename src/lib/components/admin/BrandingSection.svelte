<script lang="ts">
	import BrandingToggle from './BrandingToggle.svelte'

	interface Props {
		title: string
		toggleChecked?: boolean
		toggleDisabled?: boolean
		showToggle?: boolean
		children?: import('svelte').Snippet
	}

	let {
		title,
		toggleChecked = $bindable(false),
		toggleDisabled = false,
		showToggle = true,
		children
	}: Props = $props()
</script>

<section class="branding-section">
	<header class="branding-section__header">
		<h2 class="branding-section__title">{title}</h2>
		{#if showToggle}
			<BrandingToggle bind:checked={toggleChecked} disabled={toggleDisabled} />
		{/if}
	</header>
	<div class="branding-section__content">
		{@render children?.()}
	</div>
</section>

<style lang="scss">
	.branding-section {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.branding-section__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.branding-section__title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
		color: $gray-10;
	}

	.branding-section__content {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}
</style>
