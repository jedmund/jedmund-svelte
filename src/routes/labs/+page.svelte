<script lang="ts">
	import LabCard from '$components/LabCard.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const projects = $derived(data.projects || [])
	const error = $derived(data.error)
</script>

<div class="labs-container">
	{#if error}
		<div class="error-container">
			<div class="error-message">
				<h2>Unable to load projects</h2>
				<p>{error}</p>
			</div>
		</div>
	{:else if projects.length === 0}
		<div class="empty-container">
			<div class="empty-message">
				<h2>No projects yet</h2>
				<p>Projects will be added to Labs soon</p>
			</div>
		</div>
	{:else}
		<div class="projects-grid">
			{#each projects as project}
				<LabCard {project} />
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.labs-container {
		max-width: 700px;
		margin: 0 auto;
		padding: 0 $unit-2x;

		@include breakpoint('phone') {
			padding: $unit-3x $unit;
		}
	}

	.projects-grid {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;

		@include breakpoint('phone') {
			gap: $unit-2x;
		}
	}

	.error-container,
	.empty-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.error-message,
	.empty-message {
		text-align: center;
		max-width: 500px;

		h2 {
			font-size: 1.5rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $grey-10;
		}

		p {
			margin: 0;
			color: $grey-40;
			line-height: 1.5;
		}
	}

	.error-message {
		h2 {
			color: $red-60;
		}
	}
</style>
