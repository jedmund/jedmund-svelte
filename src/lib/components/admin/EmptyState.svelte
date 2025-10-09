<script lang="ts">
	import type { Snippet } from 'svelte'

	interface Props {
		title: string
		message: string
		icon?: Snippet
		action?: Snippet
	}

	let { title, message, icon, action }: Props = $props()
</script>

<div class="empty-state">
	{#if icon}
		<div class="empty-icon">
			{@render icon()}
		</div>
	{/if}
	<h3>{title}</h3>
	<p>{message}</p>
	{#if action}
		<div class="empty-action">
			{@render action()}
		</div>
	{/if}
</div>

<style lang="scss">
	@import '$styles/variables.scss';

	.empty-state {
		text-align: center;
		padding: $unit-8x $unit-4x;
		color: $empty-state-text;

		.empty-icon {
			font-size: calc($unit * 6); // 48px
			margin-bottom: $unit-3x;
			opacity: 0.5;
		}

		h3 {
			font-size: calc($unit * 2.5); // 20px
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $empty-state-heading;
		}

		p {
			margin: 0;
			line-height: 1.5;
		}

		.empty-action {
			margin-top: $unit-3x;
		}
	}
</style>
