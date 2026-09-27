<script lang="ts">
	import Button from '../Button.svelte'
	let { onChange, onClear }: { onChange: () => void; onClear: () => void } = $props()
</script>

<div class="image-overlay">
	<div class="overlay-actions">
		<Button
			variant="primary"
			onclick={(event) => {
				event.stopPropagation()
				onChange()
			}}
		>
			{#snippet icon()}<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>{/snippet}
			Change
		</Button>
		<Button
			variant="ghost"
			onclick={(event) => {
				event.stopPropagation()
				onClear()
			}}
		>
			{#snippet icon()}<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>{/snippet}
			Remove
		</Button>
	</div>
</div>

<style lang="scss">
	.image-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s ease;
		animation: fadeIn 0.2s ease forwards;
	}
	@keyframes fadeIn {
		to {
			opacity: 1;
		}
	}
	.overlay-actions {
		display: flex;
		gap: $unit-2x;
	}
	@media (max-width: 640px) {
		.overlay-actions {
			flex-direction: column;
			gap: $unit;
		}
	}
</style>
