<script lang="ts">
	import LabCard from '$components/LabCard.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const projects = $derived(data.projects)
</script>

<div class="labs-container">
	<div class="projects-grid">
		{#each projects as project}
			<LabCard {project} />
		{/each}
	</div>
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
</style>
